package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const turnstileSiteVerifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

type turnstileConfig struct {
	SiteKey string
	Secret  string
}

type turnstileValidator func(context.Context, string) bool

func turnstileConfigFromEnv() (turnstileConfig, error) {
	config := turnstileConfig{
		SiteKey: strings.TrimSpace(os.Getenv("TURNSTILE_SITE_KEY")),
		Secret:  strings.TrimSpace(os.Getenv("TURNSTILE_SECRET")),
	}
	if (config.SiteKey == "") != (config.Secret == "") {
		return turnstileConfig{}, errors.New("TURNSTILE_SITE_KEY and TURNSTILE_SECRET must both be configured")
	}
	return config, nil
}

func newTurnstileVerifier(secret string, client *http.Client) turnstileValidator {
	secret = strings.TrimSpace(secret)
	if secret == "" {
		return func(context.Context, string) bool { return true }
	}
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Second}
	}

	return func(ctx context.Context, token string) bool {
		token = strings.TrimSpace(token)
		if token == "" {
			return false
		}
		form := url.Values{}
		form.Set("secret", secret)
		form.Set("response", token)
		request, err := http.NewRequestWithContext(ctx, http.MethodPost, turnstileSiteVerifyURL, strings.NewReader(form.Encode()))
		if err != nil {
			return false
		}
		request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		response, err := client.Do(request)
		if err != nil {
			return false
		}
		defer response.Body.Close()
		if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
			return false
		}
		var result struct {
			Success bool `json:"success"`
		}
		if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&result); err != nil {
			return false
		}
		return result.Success
	}
}
