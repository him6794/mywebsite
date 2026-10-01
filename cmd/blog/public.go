package main

import (
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"myblog/internal/models"
)

type postSummary struct {
	ID        uint      `json:"id"`
	Title     string    `json:"title"`
	Slug      string    `json:"slug"`
	Content   string    `json:"content"`
	Tags      string    `json:"tags"`
	CreatedAt time.Time `json:"createdAt"`
}

type publicComment struct {
	ID         uint      `json:"id"`
	AuthorName string    `json:"authorName"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"createdAt"`
}

type postDetail struct {
	postSummary
	UpdatedAt time.Time       `json:"updatedAt"`
	Author    string          `json:"author"`
	Comments  []publicComment `json:"comments"`
}

func summary(post models.Post) postSummary {
	content := []rune(post.Content)
	if len(content) > 240 {
		content = append(content[:240], '…')
	}
	return postSummary{ID: post.ID, Title: post.Title, Slug: post.Slug, Content: string(content), Tags: post.Tags, CreatedAt: post.CreatedAt}
}

func clean(value string) string { return strings.TrimSpace(value) }

func validWebURL(value string) bool {
	parsed, err := url.ParseRequestURI(value)
	return err == nil && (parsed.Scheme == "https" || parsed.Scheme == "http") && parsed.Host != ""
}

func registerPublicAPI(api *gin.RouterGroup, db *gorm.DB, turnstile turnstileConfig, checkTurnstile turnstileValidator, cache publicResponseCache, cacheTTL time.Duration) {
	if checkTurnstile == nil {
		checkTurnstile = newTurnstileVerifier(turnstile.Secret, nil)
	}
	registerVisitRoute(api, db)
	api.GET("/config", cachePublicJSON(cache, cacheTTL), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"turnstileSiteKey": turnstile.SiteKey})
	})
	api.GET("/home", cachePublicJSON(cache, cacheTTL), func(c *gin.Context) {
		var projects []models.Project
		var experiences []models.Experience
		var skills []models.Skill
		var posts []models.Post
		db.Order("created_at desc").Limit(3).Find(&projects)
		db.Order("`order` desc, id desc").Find(&experiences)
		db.Order("category, name").Find(&skills)
		db.Order("created_at desc, id desc").Limit(3).Find(&posts)
		recent := make([]postSummary, 0, len(posts))
		for _, post := range posts {
			recent = append(recent, summary(post))
		}
		c.JSON(http.StatusOK, gin.H{"projects": projects, "experiences": experiences, "skills": skills, "posts": recent})
	})
	api.GET("/projects", cachePublicJSON(cache, cacheTTL), func(c *gin.Context) {
		var projects []models.Project
		db.Order("created_at desc").Find(&projects)
		c.JSON(http.StatusOK, gin.H{"projects": projects})
	})
	api.GET("/experience", cachePublicJSON(cache, cacheTTL), func(c *gin.Context) {
		var experiences []models.Experience
		var skills []models.Skill
		db.Order("`order` desc, id desc").Find(&experiences)
		db.Order("category, name").Find(&skills)
		c.JSON(http.StatusOK, gin.H{"experiences": experiences, "skills": skills})
	})
	api.GET("/friends", cachePublicJSON(cache, cacheTTL), func(c *gin.Context) {
		var friends []models.FriendSite
		db.Where("status = ?", "approved").Order("name").Find(&friends)
		c.JSON(http.StatusOK, gin.H{"friends": friends})
	})
	api.POST("/friends", func(c *gin.Context) {
		var input struct {
			Name        string `json:"name"`
			URL         string `json:"url"`
			Description string `json:"description"`
			Logo        string `json:"logo"`
		}
		if c.ShouldBindJSON(&input) != nil || clean(input.Name) == "" || !validWebURL(input.URL) || (clean(input.Logo) != "" && !validWebURL(input.Logo)) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide a name and valid website URL."})
			return
		}
		friend := models.FriendSite{Name: clean(input.Name), URL: clean(input.URL), Description: clean(input.Description), Logo: clean(input.Logo), Status: "pending"}
		if err := db.Create(&friend).Error; err != nil {
			c.JSON(500, gin.H{"error": "Unable to submit application."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Application received. Thank you!"})
	})
	api.POST("/contact", func(c *gin.Context) {
		var input struct {
			Name                string `json:"name"`
			Email               string `json:"email"`
			Subject             string `json:"subject"`
			Message             string `json:"message"`
			TurnstileResponse   string `json:"cf-turnstile-response"`
			TurnstileTokenAlias string `json:"turnstileToken"`
		}
		if c.ShouldBindJSON(&input) != nil || clean(input.Name) == "" || !strings.Contains(input.Email, "@") || clean(input.Subject) == "" || clean(input.Message) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Please complete all fields with a valid email address."})
			return
		}
		token := input.TurnstileResponse
		if token == "" {
			token = input.TurnstileTokenAlias
		}
		if !checkTurnstile(c.Request.Context(), token) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Please complete the security check."})
			return
		}
		contact := models.Contact{Name: clean(input.Name), Email: clean(input.Email), Subject: clean(input.Subject), Message: clean(input.Message)}
		if err := db.Create(&contact).Error; err != nil {
			c.JSON(500, gin.H{"error": "Unable to send your message."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Message sent. I’ll be in touch soon."})
	})
	api.GET("/posts", cachePublicJSON(cache, cacheTTL), func(c *gin.Context) {
		var posts []models.Post
		var all []models.Post
		query := db.Order("created_at desc, id desc")
		if q := clean(c.Query("q")); q != "" {
			term := "%" + q + "%"
			query = query.Where("title LIKE ? OR content LIKE ? OR tags LIKE ?", term, term, term)
		}
		if tag := clean(c.Query("tag")); tag != "" {
			query = query.Where("tags LIKE ?", "%"+tag+"%")
		}
		query.Find(&posts)
		db.Select("tags").Find(&all)
		tagSet := make(map[string]bool)
		for _, post := range all {
			for _, tag := range strings.Split(post.Tags, ",") {
				if tag = clean(tag); tag != "" {
					tagSet[tag] = true
				}
			}
		}
		tags := make([]string, 0, len(tagSet))
		for tag := range tagSet {
			tags = append(tags, tag)
		}
		sort.Strings(tags)
		items := make([]postSummary, 0, len(posts))
		for _, post := range posts {
			items = append(items, summary(post))
		}
		c.JSON(http.StatusOK, gin.H{"posts": items, "tags": tags})
	})
	api.GET("/posts/random", func(c *gin.Context) {
		var post models.Post
		if err := db.Order("random()").First(&post).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "No posts yet."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"slug": post.Slug})
	})
	api.GET("/posts/:slug", cachePublicJSON(cache, cacheTTL), func(c *gin.Context) {
		var post models.Post
		if err := db.Preload("Author").Preload("Comments", "is_approved = ?", true).Where("slug = ?", c.Param("slug")).First(&post).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found."})
			return
		}
		comments := make([]publicComment, 0, len(post.Comments))
		for _, comment := range post.Comments {
			comments = append(comments, publicComment{ID: comment.ID, AuthorName: comment.AuthorName, Content: comment.Content, CreatedAt: comment.CreatedAt})
		}
		var previous, next models.Post
		prevErr := db.Where("(created_at < ? OR (created_at = ? AND id < ?))", post.CreatedAt, post.CreatedAt, post.ID).Order("created_at desc, id desc").First(&previous).Error
		nextErr := db.Where("(created_at > ? OR (created_at = ? AND id > ?))", post.CreatedAt, post.CreatedAt, post.ID).Order("created_at asc, id asc").First(&next).Error
		var prevSummary, nextSummary *postSummary
		if prevErr == nil {
			s := summary(previous)
			prevSummary = &s
		}
		if nextErr == nil {
			s := summary(next)
			nextSummary = &s
		}
		full := summary(post)
		full.Content = post.Content
		c.JSON(http.StatusOK, gin.H{"post": postDetail{postSummary: full, UpdatedAt: post.UpdatedAt, Author: post.Author.Username, Comments: comments}, "previous": prevSummary, "next": nextSummary})
	})
	api.POST("/posts/:slug/comments", func(c *gin.Context) {
		var post models.Post
		if err := db.Where("slug = ?", c.Param("slug")).First(&post).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found."})
			return
		}
		var input struct {
			AuthorName          string `json:"authorName"`
			AuthorEmail         string `json:"authorEmail"`
			Content             string `json:"content"`
			TurnstileResponse   string `json:"cf-turnstile-response"`
			TurnstileTokenAlias string `json:"turnstileToken"`
		}
		if c.ShouldBindJSON(&input) != nil || clean(input.AuthorName) == "" || !strings.Contains(input.AuthorEmail, "@") || clean(input.Content) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide your name, email, and comment."})
			return
		}
		token := input.TurnstileResponse
		if token == "" {
			token = input.TurnstileTokenAlias
		}
		if !checkTurnstile(c.Request.Context(), token) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Please complete the security check."})
			return
		}
		comment := models.Comment{PostID: post.ID, AuthorName: clean(input.AuthorName), AuthorEmail: clean(input.AuthorEmail), Content: clean(input.Content), IsApproved: false}
		if err := db.Create(&comment).Error; err != nil {
			c.JSON(500, gin.H{"error": "Unable to save comment."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Comment submitted for review."})
	})
}
