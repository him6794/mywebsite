package main

import (
	"crypto/sha256"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/joho/godotenv"
	"gorm.io/gorm"

	"myblog/internal/models"
)

func openDatabase(path string) (*gorm.DB, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return nil, err
	}
	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	for _, model := range []interface{}{&models.User{}, &models.Post{}, &models.Project{}, &models.Experience{}, &models.Skill{}, &models.FriendSite{}, &models.DailyStat{}, &models.GlobalStat{}, &models.Comment{}, &models.Contact{}} {
		if !db.Migrator().HasTable(model) {
			if err := db.AutoMigrate(model); err != nil {
				return nil, err
			}
		}
	}
	return db, nil
}

func databasePath() string {
	path := os.Getenv("DATABASE_URL")
	if path == "" || path == "sqlite:///blog.db" {
		return "instance/blog.db"
	}
	return strings.TrimPrefix(path, "sqlite:///")
}

func projectRoot() string {
	path, _ := os.Getwd()
	for {
		if _, err := os.Stat(filepath.Join(path, "go.mod")); err == nil {
			return path
		}
		parent := filepath.Dir(path)
		if parent == path {
			return "."
		}
		path = parent
	}
}

func registerLegacyFiles(r *gin.Engine, root string, db *gorm.DB) {
	files := []struct {
		url         string
		path        string
		contentType string
	}{
		{url: "/robots.txt", path: filepath.Join(root, "robots.txt"), contentType: "text/plain; charset=utf-8"},
	}
	for _, file := range files {
		handler := func(c *gin.Context) {
			f, err := os.Open(file.path)
			if err != nil {
				c.Status(http.StatusNotFound)
				return
			}
			defer f.Close()
			info, err := f.Stat()
			if err != nil || info.IsDir() {
				c.Status(http.StatusNotFound)
				return
			}
			c.Header("Content-Type", file.contentType)
			http.ServeContent(c.Writer, c.Request, filepath.Base(file.path), info.ModTime(), f)
		}
		r.GET(file.url, handler)
		r.HEAD(file.url, handler)
	}
	sitemap := mainSitemapHandler(db)
	r.GET("/sitemap.xml", sitemap)
	r.HEAD("/sitemap.xml", sitemap)
	postsSitemap := postsSitemapHandler(db)
	r.GET("/sitemap-posts.xml", postsSitemap)
	r.HEAD("/sitemap-posts.xml", postsSitemap)
}

type routerSecurityConfig struct {
	allowedOrigins map[string]struct{}
	cookieSameSite http.SameSite
}

func normalizeOrigin(raw string) (string, error) {
	if raw == "" || raw != strings.TrimSpace(raw) || strings.ContainsAny(raw, "*#") {
		return "", fmt.Errorf("invalid origin %q", raw)
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("invalid origin %q: %w", raw, err)
	}
	scheme := strings.ToLower(parsed.Scheme)
	if (scheme != "http" && scheme != "https") || parsed.Host == "" || parsed.User != nil || parsed.Opaque != "" || parsed.Path != "" || parsed.RawPath != "" || parsed.RawQuery != "" || parsed.ForceQuery || parsed.Fragment != "" || parsed.RawFragment != "" {
		return "", fmt.Errorf("origin must contain only an http(s) scheme and host: %q", raw)
	}

	hostname := parsed.Hostname()
	if hostname == "" || strings.ContainsAny(hostname, " \t\r\n/%") {
		return "", fmt.Errorf("invalid origin host %q", parsed.Host)
	}
	port := parsed.Port()
	if strings.HasSuffix(parsed.Host, ":") {
		return "", fmt.Errorf("invalid origin port in %q", raw)
	}
	if port != "" {
		portNumber, err := strconv.Atoi(port)
		if err != nil || portNumber < 1 || portNumber > 65535 {
			return "", fmt.Errorf("invalid origin port in %q", raw)
		}
	}
	if ip := net.ParseIP(hostname); ip == nil {
		if len(hostname) > 253 {
			return "", fmt.Errorf("invalid origin host %q", parsed.Host)
		}
		for _, label := range strings.Split(strings.TrimSuffix(hostname, "."), ".") {
			if label == "" || len(label) > 63 || label[0] == '-' || label[len(label)-1] == '-' {
				return "", fmt.Errorf("invalid origin host %q", parsed.Host)
			}
			for _, char := range label {
				if (char < 'a' || char > 'z') && (char < 'A' || char > 'Z') && (char < '0' || char > '9') && char != '-' {
					return "", fmt.Errorf("invalid origin host %q", parsed.Host)
				}
			}
		}
	}

	host := strings.ToLower(hostname)
	if strings.Contains(host, ":") {
		host = "[" + host + "]"
	}
	if port != "" && !((scheme == "http" && port == "80") || (scheme == "https" && port == "443")) {
		host += ":" + port
	}
	return scheme + "://" + host, nil
}

func parseCORSAllowedOrigins(value string) (map[string]struct{}, error) {
	origins := make(map[string]struct{})
	for _, configured := range strings.Split(value, ",") {
		configured = strings.TrimSpace(configured)
		if configured == "" {
			continue
		}
		origin, err := normalizeOrigin(configured)
		if err != nil {
			return nil, err
		}
		origins[origin] = struct{}{}
	}
	return origins, nil
}

func parseSessionCookieSameSite(value string, secureCookies bool) (http.SameSite, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "strict":
		return http.SameSiteStrictMode, nil
	case "lax":
		return http.SameSiteLaxMode, nil
	case "none":
		if !secureCookies {
			return 0, fmt.Errorf("SESSION_COOKIE_SAME_SITE=None requires Secure cookies (set GIN_MODE=release)")
		}
		return http.SameSiteNoneMode, nil
	default:
		return 0, fmt.Errorf("SESSION_COOKIE_SAME_SITE must be Strict, Lax, or None")
	}
}

func originsForRouter(configured map[string]struct{}) map[string]struct{} {
	origins := make(map[string]struct{}, len(configured)+2)
	for origin := range configured {
		origins[origin] = struct{}{}
	}
	if gin.Mode() == gin.DebugMode {
		for _, origin := range []string{"http://localhost:5173", "http://127.0.0.1:5173"} {
			origins[origin] = struct{}{}
		}
	}
	return origins
}

func addVaryOrigin(header http.Header) {
	for _, value := range header.Values("Vary") {
		for _, name := range strings.Split(value, ",") {
			if strings.EqualFold(strings.TrimSpace(name), "Origin") {
				return
			}
		}
	}
	header.Add("Vary", "Origin")
}

func corsRequestMethodAllowed(method string) bool {
	switch strings.ToUpper(strings.TrimSpace(method)) {
	case http.MethodGet, http.MethodHead, http.MethodPost, http.MethodPut, http.MethodDelete:
		return true
	default:
		return false
	}
}

func corsRequestHeadersAllowed(header http.Header) bool {
	for _, value := range header.Values("Access-Control-Request-Headers") {
		for _, name := range strings.Split(value, ",") {
			if name = strings.TrimSpace(name); name != "" && !strings.EqualFold(name, "Content-Type") {
				return false
			}
		}
	}
	return true
}

func corsMiddleware(allowedOrigins map[string]struct{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			c.Next()
			return
		}
		addVaryOrigin(c.Writer.Header())
		originKey, err := normalizeOrigin(origin)
		_, allowed := allowedOrigins[originKey]
		allowed = allowed && err == nil
		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
		}

		requestedMethod := strings.TrimSpace(c.GetHeader("Access-Control-Request-Method"))
		if c.Request.Method == http.MethodOptions && requestedMethod != "" {
			if !allowed || !corsRequestMethodAllowed(requestedMethod) || !corsRequestHeadersAllowed(c.Request.Header) {
				c.AbortWithStatus(http.StatusForbidden)
				return
			}
			c.Header("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, DELETE")
			if len(c.Request.Header.Values("Access-Control-Request-Headers")) > 0 {
				c.Header("Access-Control-Allow-Headers", "Content-Type")
			}
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func newRouter(db *gorm.DB, secret string, secureCookies bool, turnstile turnstileConfig) *gin.Engine {
	return newRouterWithVerifier(db, secret, secureCookies, turnstile, newTurnstileVerifier(turnstile.Secret, nil))
}

func newRouterWithVerifier(db *gorm.DB, secret string, secureCookies bool, turnstile turnstileConfig, checkTurnstile turnstileValidator) *gin.Engine {
	return newRouterWithVerifierAndCache(db, secret, secureCookies, turnstile, checkTurnstile, nil, defaultPublicCacheTTL)
}

func newRouterWithCache(db *gorm.DB, secret string, secureCookies bool, turnstile turnstileConfig, cache publicResponseCache, cacheTTL time.Duration) *gin.Engine {
	return newRouterWithVerifierAndCache(db, secret, secureCookies, turnstile, newTurnstileVerifier(turnstile.Secret, nil), cache, cacheTTL)
}

func newRouterWithVerifierAndCache(db *gorm.DB, secret string, secureCookies bool, turnstile turnstileConfig, checkTurnstile turnstileValidator, cache publicResponseCache, cacheTTL time.Duration) *gin.Engine {
	return newRouterWithVerifierAndCacheAndSecurity(db, secret, secureCookies, turnstile, checkTurnstile, cache, cacheTTL, routerSecurityConfig{cookieSameSite: http.SameSiteStrictMode})
}

func newRouterWithVerifierAndCacheAndSecurity(db *gorm.DB, secret string, secureCookies bool, turnstile turnstileConfig, checkTurnstile turnstileValidator, cache publicResponseCache, cacheTTL time.Duration, security routerSecurityConfig) *gin.Engine {
	root := projectRoot()
	r := gin.New()
	r.Use(gin.Recovery(), gin.LoggerWithConfig(gin.LoggerConfig{
		Skip: func(c *gin.Context) bool {
			return c.Request.Method == http.MethodPost && c.Request.URL.Path == "/api/visit"
		},
	}), gzip.Gzip(gzip.DefaultCompression,
		gzip.WithMinLength(1024),
		gzip.WithExcludedExtensions([]string{".woff2", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico"}),
	))
	r.Use(func(c *gin.Context) {
		if name := strings.TrimPrefix(c.Request.URL.Path, "/assets/"); name != c.Request.URL.Path && filepath.IsLocal(name) {
			if info, err := os.Stat(filepath.Join(root, "web", "dist", "assets", name)); err == nil && info.Mode().IsRegular() {
				c.Header("Cache-Control", "public, max-age=31536000, immutable")
			}
		}
		c.Next()
	})
	key := sha256.Sum256([]byte(secret))
	store := cookie.NewStore(key[:])
	if security.cookieSameSite == 0 {
		security.cookieSameSite = http.SameSiteStrictMode
	}
	store.Options(sessions.Options{Path: "/", MaxAge: 86400 * 7, HttpOnly: true, Secure: secureCookies, SameSite: security.cookieSameSite})
	origins := originsForRouter(security.allowedOrigins)
	r.Use(corsMiddleware(origins))
	r.Use(sameOrigin(origins))
	r.Use(sessions.Sessions("justin_session", store))
	r.Use(invalidatePublicDataAfterWrite(cache))

	api := r.Group("/api")
	registerPublicAPI(api, db, turnstile, checkTurnstile, cache, cacheTTL)
	registerAuthAPI(api, db)
	registerAdminAPI(api, db)

	registerLegacyFiles(r, root, db)
	r.GET("/blog/:id", func(c *gin.Context) {
		idText := c.Param("id")
		if idText == "" || strings.IndexFunc(idText, func(r rune) bool { return r < '0' || r > '9' }) >= 0 {
			c.Header("Cache-Control", "no-cache")
			c.File(filepath.Join(root, "web", "dist", "index.html"))
			return
		}
		id, err := strconv.ParseUint(idText, 10, 64)
		if err != nil {
			c.Status(http.StatusNotFound)
			return
		}
		var post models.Post
		if err := db.First(&post, id).Error; err != nil {
			c.Status(http.StatusNotFound)
			return
		}
		c.Redirect(http.StatusMovedPermanently, "/blog/"+url.PathEscape(post.Slug))
	})
	r.Static("/static", filepath.Join(root, "static"))
	r.Static("/assets", filepath.Join(root, "web", "dist", "assets"))
	r.GET("/favicon.svg", func(c *gin.Context) { c.File(filepath.Join(root, "web", "dist", "favicon.svg")) })
	r.NoRoute(func(c *gin.Context) {
		if c.Request.Method != http.MethodGet || strings.HasPrefix(c.Request.URL.Path, "/api/") || strings.Contains(filepath.Base(c.Request.URL.Path), ".") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.Header("Cache-Control", "no-cache")
		c.File(filepath.Join(root, "web", "dist", "index.html"))
	})
	return r
}

func sameOrigin(allowedOrigins map[string]struct{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead && c.Request.Method != http.MethodOptions {
			if origin := c.GetHeader("Origin"); origin != "" {
				originKey, originErr := normalizeOrigin(origin)
				scheme := "http"
				if c.Request.TLS != nil || strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https") {
					scheme = "https"
				}
				requestKey, requestErr := normalizeOrigin(scheme + "://" + c.Request.Host)
				_, configured := allowedOrigins[originKey]
				if originErr != nil || requestErr != nil || (originKey != requestKey && !configured) {
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid origin"})
					return
				}
			}
		}
		c.Next()
	}
}

func main() {
	_ = godotenv.Load()
	secret := os.Getenv("SECRET_KEY")
	if secret == "" {
		log.Fatal("SECRET_KEY is required")
	}
	if len(secret) < 32 {
		log.Print("warning: use a longer SECRET_KEY (at least 32 random characters) in production")
	}
	turnstile, err := turnstileConfigFromEnv()
	if err != nil {
		log.Fatal(err)
	}
	allowedOrigins, err := parseCORSAllowedOrigins(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if err != nil {
		log.Fatal(err)
	}
	secureCookies := gin.Mode() == gin.ReleaseMode
	cookieSameSite, err := parseSessionCookieSameSite(os.Getenv("SESSION_COOKIE_SAME_SITE"), secureCookies)
	if err != nil {
		log.Fatal(err)
	}
	security := routerSecurityConfig{allowedOrigins: allowedOrigins, cookieSameSite: cookieSameSite}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	address := strings.TrimSpace(os.Getenv("LISTEN_ADDR"))
	if address == "" {
		address = ":" + port
	}
	db, err := openDatabase(databasePath())
	if err != nil {
		log.Fatal(err)
	}
	cache, cacheTTL, closeCache := publicCacheFromEnv()
	log.Printf("listening on %s", address)
	if err := newRouterWithVerifierAndCacheAndSecurity(db, secret, secureCookies, turnstile, newTurnstileVerifier(turnstile.Secret, nil), cache, cacheTTL, security).Run(address); err != nil {
		closeCache()
		log.Fatal(err)
	}
	closeCache()
}
