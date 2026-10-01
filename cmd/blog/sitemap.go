package main

import (
	"bytes"
	"encoding/xml"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"myblog/internal/models"
)

const (
	defaultSiteURL     = "https://justin0711.com"
	sitemapNamespace   = "http://www.sitemaps.org/schemas/sitemap/0.9"
	sitemapContentType = "application/xml; charset=utf-8"
)

type sitemapDocument struct {
	XMLName xml.Name       `xml:"urlset"`
	XMLNS   string         `xml:"xmlns,attr"`
	URLs    []sitemapEntry `xml:"url"`
}

type sitemapEntry struct {
	Loc        string `xml:"loc"`
	Lastmod    string `xml:"lastmod,omitempty"`
	Changefreq string `xml:"changefreq"`
	Priority   string `xml:"priority"`
}

func mainSitemapHandler(db *gorm.DB) gin.HandlerFunc {
	return sitemapHandler(db, "sitemap.xml", true)
}

func postsSitemapHandler(db *gorm.DB) gin.HandlerFunc {
	return sitemapHandler(db, "sitemap-posts.xml", false)
}

func sitemapHandler(db *gorm.DB, filename string, includeStaticPages bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		body, err := renderSitemap(db, siteBaseURL(), includeStaticPages)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}
		c.Header("Content-Type", sitemapContentType)
		http.ServeContent(c.Writer, c.Request, filename, time.Time{}, bytes.NewReader(body))
	}
}

func renderSitemap(db *gorm.DB, base *url.URL, includeStaticPages bool) ([]byte, error) {
	var posts []models.Post
	if err := db.Select("slug", "created_at", "updated_at").Order("updated_at desc, created_at desc").Find(&posts).Error; err != nil {
		return nil, err
	}

	document := sitemapDocument{
		XMLNS: sitemapNamespace,
		URLs:  make([]sitemapEntry, 0, len(posts)+7),
	}
	if includeStaticPages {
		for _, path := range []string{"/", "/portfolio", "/experience", "/friends", "/blog", "/contact", "/login"} {
			document.URLs = append(document.URLs, sitemapEntry{
				Loc:        canonicalPageURL(base, path),
				Changefreq: "weekly",
				Priority:   "0.8",
			})
		}
	}
	for _, post := range posts {
		lastmod := post.UpdatedAt
		if lastmod.IsZero() {
			lastmod = post.CreatedAt
		}
		entry := sitemapEntry{
			Loc:        canonicalPostURL(base, post.Slug),
			Changefreq: "monthly",
			Priority:   "0.6",
		}
		if !lastmod.IsZero() {
			entry.Lastmod = lastmod.UTC().Format("2006-01-02")
		}
		document.URLs = append(document.URLs, entry)
	}

	encoded, err := xml.MarshalIndent(document, "", "  ")
	if err != nil {
		return nil, err
	}
	body := append([]byte(xml.Header), encoded...)
	body = append(body, '\n')
	return body, nil
}

func siteBaseURL() *url.URL {
	configured := strings.TrimSpace(os.Getenv("SITE_URL"))
	if configured == "" {
		configured = defaultSiteURL
	}
	base, err := url.Parse(configured)
	if err != nil || (base.Scheme != "http" && base.Scheme != "https") || base.Host == "" || base.User != nil || base.Opaque != "" || base.RawQuery != "" || base.ForceQuery || base.Fragment != "" {
		base, _ = url.Parse(defaultSiteURL)
		return base
	}
	base.Path = strings.TrimRight(base.Path, "/")
	base.RawPath = strings.TrimRight(base.EscapedPath(), "/")
	return base
}

func canonicalPageURL(base *url.URL, path string) string {
	return canonicalEscapedPathURL(base, path, path)
}

func canonicalPostURL(base *url.URL, slug string) string {
	return canonicalEscapedPathURL(base, "/blog/"+slug, "/blog/"+url.PathEscape(slug))
}

func canonicalEscapedPathURL(base *url.URL, path, escapedPath string) string {
	canonical := *base
	canonical.Path = strings.TrimRight(base.Path, "/") + path
	canonical.RawPath = strings.TrimRight(base.EscapedPath(), "/") + escapedPath
	return canonical.String()
}
