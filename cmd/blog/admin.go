package main

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"myblog/internal/models"
)

func registerAuthAPI(api *gin.RouterGroup, db *gorm.DB) {
	api.GET("/session", func(c *gin.Context) {
		user, ok := sessionUser(c, db)
		if !ok {
			c.JSON(http.StatusOK, gin.H{"authenticated": false})
			return
		}
		c.JSON(http.StatusOK, gin.H{"authenticated": true, "username": user.Username})
	})
	api.POST("/login", func(c *gin.Context) {
		var input struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if c.ShouldBindJSON(&input) != nil {
			c.JSON(400, gin.H{"error": "Invalid credentials."})
			return
		}
		var user models.User
		if db.Where("username = ?", input.Username).First(&user).Error != nil || !verifyPasswordHash(user.PasswordHash, input.Password) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials."})
			return
		}
		session := sessions.Default(c)
		session.Set("user_id", user.ID)
		if err := session.Save(); err != nil {
			c.JSON(500, gin.H{"error": "Unable to start session."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"authenticated": true, "username": user.Username})
	})
	api.POST("/logout", func(c *gin.Context) {
		session := sessions.Default(c)
		session.Clear()
		if err := session.Save(); err != nil {
			c.JSON(500, gin.H{"error": "Unable to end session."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"authenticated": false})
	})
}

func sessionUser(c *gin.Context, db *gorm.DB) (models.User, bool) {
	id := sessions.Default(c).Get("user_id")
	var user models.User
	if id == nil || db.First(&user, id).Error != nil {
		return user, false
	}
	return user, true
}

func requireAdmin(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := sessionUser(c, db)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Sign in to continue."})
			return
		}
		c.Set("user_id", user.ID)
		c.Next()
	}
}

func parseID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID."})
		return 0, false
	}
	return uint(id), true
}

func respondError(c *gin.Context, err error) bool {
	if err == nil {
		return false
	}
	c.JSON(http.StatusBadRequest, gin.H{"error": "Unable to save changes. Check the fields and try again."})
	return true
}

var slugPattern = regexp.MustCompile(`[^\pL\pN]+`)

func makeSlug(title string) string {
	slug := strings.Trim(slugPattern.ReplaceAllString(strings.ToLower(clean(title)), "-"), "-")
	if slug == "" {
		slug = "post-" + strconv.FormatInt(time.Now().Unix(), 10)
	}
	return slug
}

func registerAdminAPI(api *gin.RouterGroup, db *gorm.DB) {
	admin := api.Group("/admin", requireAdmin(db))
	admin.GET("/overview", func(c *gin.Context) {
		var posts, projects, pendingFriends, pendingComments, unreadContacts, visitsToday, totalVisits int64
		db.Model(&models.Post{}).Count(&posts)
		db.Model(&models.Project{}).Count(&projects)
		db.Model(&models.FriendSite{}).Where("status = ?", "pending").Count(&pendingFriends)
		db.Model(&models.Comment{}).Where("is_approved = ?", false).Count(&pendingComments)
		db.Model(&models.Contact{}).Where("is_read = ?", false).Count(&unreadContacts)
		db.Model(&models.DailyStat{}).Select("COALESCE(SUM(visits), 0)").Where("date = ?", utcStatDate(time.Now())).Scan(&visitsToday)
		db.Model(&models.GlobalStat{}).Order("id").Limit(1).Select("total_visits").Scan(&totalVisits)
		c.JSON(http.StatusOK, gin.H{"posts": posts, "projects": projects, "pendingFriends": pendingFriends, "pendingComments": pendingComments, "unreadContacts": unreadContacts, "visitsToday": visitsToday, "totalVisits": totalVisits})
	})
	admin.GET("/:resource", func(c *gin.Context) {
		switch c.Param("resource") {
		case "posts":
			var posts []models.Post
			db.Order("created_at desc").Find(&posts)
			c.JSON(200, gin.H{"items": posts})
		case "projects":
			var projects []models.Project
			db.Order("created_at desc").Find(&projects)
			c.JSON(200, gin.H{"items": projects})
		case "experience":
			var experiences []models.Experience
			db.Order("`order` desc, id desc").Find(&experiences)
			c.JSON(200, gin.H{"items": experiences})
		case "skills":
			var skills []models.Skill
			db.Order("category, name").Find(&skills)
			c.JSON(200, gin.H{"items": skills})
		case "friends":
			var friends []models.FriendSite
			db.Order("created_at desc").Find(&friends)
			c.JSON(200, gin.H{"items": friends})
		case "comments":
			var comments []models.Comment
			db.Order("created_at desc").Find(&comments)
			c.JSON(200, gin.H{"items": comments})
		case "contacts":
			var contacts []models.Contact
			db.Order("created_at desc").Find(&contacts)
			c.JSON(200, gin.H{"items": contacts})
		default:
			c.JSON(404, gin.H{"error": "Not found."})
		}
	})
	admin.POST("/:resource", func(c *gin.Context) {
		switch c.Param("resource") {
		case "posts":
			var input struct {
				Title   string `json:"Title"`
				Content string `json:"Content"`
				Tags    string `json:"Tags"`
				Slug    string `json:"Slug"`
			}
			if c.ShouldBindJSON(&input) != nil || clean(input.Title) == "" || clean(input.Content) == "" {
				c.JSON(400, gin.H{"error": "Title and content are required."})
				return
			}
			slug := clean(input.Slug)
			if slug == "" {
				slug = makeSlug(input.Title)
			}
			post := models.Post{Title: clean(input.Title), Content: input.Content, Tags: clean(input.Tags), Slug: slug, UserID: c.GetUint("user_id")}
			if respondError(c, db.Create(&post).Error) {
				return
			}
			c.JSON(201, post)
		case "projects":
			var input models.Project
			if c.ShouldBindJSON(&input) != nil || clean(input.Title) == "" {
				c.JSON(400, gin.H{"error": "A title is required."})
				return
			}
			input.ID = 0
			if respondError(c, db.Create(&input).Error) {
				return
			}
			c.JSON(201, input)
		case "experience":
			var input models.Experience
			if c.ShouldBindJSON(&input) != nil || clean(input.Title) == "" {
				c.JSON(400, gin.H{"error": "A title is required."})
				return
			}
			input.ID = 0
			if respondError(c, db.Create(&input).Error) {
				return
			}
			c.JSON(201, input)
		case "skills":
			var input models.Skill
			if c.ShouldBindJSON(&input) != nil || clean(input.Name) == "" {
				c.JSON(400, gin.H{"error": "A name is required."})
				return
			}
			input.ID = 0
			if respondError(c, db.Create(&input).Error) {
				return
			}
			c.JSON(201, input)
		default:
			c.JSON(404, gin.H{"error": "Not found."})
		}
	})
	admin.PUT("/:resource/:id", func(c *gin.Context) {
		id, ok := parseID(c)
		if !ok {
			return
		}
		switch c.Param("resource") {
		case "posts":
			var post models.Post
			if db.First(&post, id).Error != nil {
				c.JSON(404, gin.H{"error": "Not found."})
				return
			}
			var input struct {
				Title   string `json:"Title"`
				Content string `json:"Content"`
				Tags    string `json:"Tags"`
				Slug    string `json:"Slug"`
			}
			if c.ShouldBindJSON(&input) != nil || clean(input.Title) == "" || clean(input.Content) == "" {
				c.JSON(400, gin.H{"error": "Title and content are required."})
				return
			}
			post.Title = clean(input.Title)
			post.Content = input.Content
			post.Tags = clean(input.Tags)
			post.Slug = clean(input.Slug)
			if post.Slug == "" {
				post.Slug = makeSlug(post.Title)
			}
			if respondError(c, db.Save(&post).Error) {
				return
			}
			c.JSON(200, post)
		case "projects":
			var project models.Project
			if db.First(&project, id).Error != nil {
				c.JSON(404, gin.H{"error": "Not found."})
				return
			}
			var input models.Project
			if c.ShouldBindJSON(&input) != nil || clean(input.Title) == "" {
				c.JSON(400, gin.H{"error": "A title is required."})
				return
			}
			project.Title = clean(input.Title)
			project.Description = input.Description
			project.Image = input.Image
			project.GithubURL = input.GithubURL
			project.DemoURL = input.DemoURL
			if respondError(c, db.Save(&project).Error) {
				return
			}
			c.JSON(200, project)
		case "experience":
			var exp models.Experience
			if db.First(&exp, id).Error != nil {
				c.JSON(404, gin.H{"error": "Not found."})
				return
			}
			var input models.Experience
			if c.ShouldBindJSON(&input) != nil || clean(input.Title) == "" {
				c.JSON(400, gin.H{"error": "A title is required."})
				return
			}
			exp.Title = clean(input.Title)
			exp.Company = input.Company
			exp.Period = input.Period
			exp.Description = input.Description
			exp.Order = input.Order
			if respondError(c, db.Save(&exp).Error) {
				return
			}
			c.JSON(200, exp)
		case "skills":
			var skill models.Skill
			if db.First(&skill, id).Error != nil {
				c.JSON(404, gin.H{"error": "Not found."})
				return
			}
			var input models.Skill
			if c.ShouldBindJSON(&input) != nil || clean(input.Name) == "" {
				c.JSON(400, gin.H{"error": "A name is required."})
				return
			}
			skill.Name = clean(input.Name)
			skill.Category = clean(input.Category)
			skill.Icon = clean(input.Icon)
			if respondError(c, db.Save(&skill).Error) {
				return
			}
			c.JSON(200, skill)
		case "friends":
			var friend models.FriendSite
			if db.First(&friend, id).Error != nil {
				c.JSON(404, gin.H{"error": "Not found."})
				return
			}
			var input struct {
				Name        string `json:"Name"`
				URL         string `json:"URL"`
				Description string `json:"Description"`
				Logo        string `json:"Logo"`
				Status      string `json:"Status"`
			}
			if c.ShouldBindJSON(&input) != nil || clean(input.Name) == "" || !validWebURL(input.URL) || (input.Logo != "" && !validWebURL(input.Logo)) || (input.Status != "pending" && input.Status != "approved") {
				c.JSON(400, gin.H{"error": "Check the name, URLs, and status."})
				return
			}
			friend.Name = clean(input.Name)
			friend.URL = input.URL
			friend.Description = input.Description
			friend.Logo = input.Logo
			friend.Status = input.Status
			if respondError(c, db.Save(&friend).Error) {
				return
			}
			c.JSON(200, friend)
		case "comments":
			var comment models.Comment
			if db.First(&comment, id).Error != nil {
				c.JSON(404, gin.H{"error": "Not found."})
				return
			}
			var input struct {
				IsApproved bool `json:"IsApproved"`
			}
			if c.ShouldBindJSON(&input) != nil {
				c.JSON(400, gin.H{"error": "Invalid request."})
				return
			}
			if respondError(c, db.Model(&comment).Update("is_approved", input.IsApproved).Error) {
				return
			}
			c.JSON(200, gin.H{"updated": true})
		case "contacts":
			var contact models.Contact
			if db.First(&contact, id).Error != nil {
				c.JSON(404, gin.H{"error": "Not found."})
				return
			}
			var input struct {
				IsRead bool `json:"IsRead"`
			}
			if c.ShouldBindJSON(&input) != nil {
				c.JSON(400, gin.H{"error": "Invalid request."})
				return
			}
			if respondError(c, db.Model(&contact).Update("is_read", input.IsRead).Error) {
				return
			}
			c.JSON(200, gin.H{"updated": true})
		default:
			c.JSON(404, gin.H{"error": "Not found."})
		}
	})
	admin.DELETE("/:resource/:id", func(c *gin.Context) {
		id, ok := parseID(c)
		if !ok {
			return
		}
		var model interface{}
		switch c.Param("resource") {
		case "posts":
			model = &models.Post{}
		case "projects":
			model = &models.Project{}
		case "experience":
			model = &models.Experience{}
		case "skills":
			model = &models.Skill{}
		case "friends":
			model = &models.FriendSite{}
		case "comments":
			model = &models.Comment{}
		case "contacts":
			model = &models.Contact{}
		default:
			c.JSON(404, gin.H{"error": "Not found."})
			return
		}
		result := db.Delete(model, id)
		if respondError(c, result.Error) {
			return
		}
		if result.RowsAffected == 0 {
			c.JSON(404, gin.H{"error": "Not found."})
			return
		}
		c.Status(http.StatusNoContent)
	})
}
