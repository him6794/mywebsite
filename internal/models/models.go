package models

import (
	"time"
)

type User struct {
	ID           uint      `gorm:"primaryKey"`
	Username     string    `gorm:"unique;not null;size:80"`
	PasswordHash string    `gorm:"size:128"`
	Posts        []Post    `gorm:"foreignKey:UserID"`
}

func (User) TableName() string {
	return "user"
}

type Post struct {
	ID        uint      `gorm:"primaryKey"`
	Title     string    `gorm:"not null;size:200"`
	Slug      string    `gorm:"unique;not null;size:200"`
	Content   string    `gorm:"not null;type:text"`
	Tags      string    `gorm:"size:200"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UserID    uint      `gorm:"not null"`
	Author    User      `gorm:"foreignKey:UserID"`
	Comments  []Comment `gorm:"foreignKey:PostID;constraint:OnDelete:CASCADE"`
}

func (Post) TableName() string {
	return "post"
}

type Project struct {
	ID          uint      `gorm:"primaryKey"`
	Title       string    `gorm:"not null;size:100"`
	Description string    `gorm:"not null;type:text"`
	Image       string    `gorm:"size:200"`
	GithubURL   string    `gorm:"size:200"`
	DemoURL     string    `gorm:"size:200"`
	CreatedAt   time.Time `gorm:"default:CURRENT_TIMESTAMP"`
}

func (Project) TableName() string {
	return "project"
}

type Experience struct {
	ID          uint   `gorm:"primaryKey"`
	Title       string `gorm:"not null;size:100"`
	Company     string `gorm:"not null;size:100"`
	Period      string `gorm:"not null;size:50"`
	Description string `gorm:"type:text"`
	Order       int    `gorm:"default:0"`
}

func (Experience) TableName() string {
	return "experience"
}

type Skill struct {
	ID       uint   `gorm:"primaryKey"`
	Name     string `gorm:"not null;size:50"`
	Category string `gorm:"size:50"`
	Icon     string `gorm:"size:50"`
}

func (Skill) TableName() string {
	return "skill"
}

type FriendSite struct {
	ID          uint      `gorm:"primaryKey"`
	Name        string    `gorm:"not null;size:100"`
	URL         string    `gorm:"not null;size:200"`
	Description string    `gorm:"size:200"`
	Logo        string    `gorm:"size:200"`
	Status      string    `gorm:"default:'pending';size:20"`
	CreatedAt   time.Time `gorm:"default:CURRENT_TIMESTAMP"`
}

func (FriendSite) TableName() string {
	return "friend_site"
}

type DailyStat struct {
	ID     uint      `gorm:"primaryKey"`
	Date   time.Time `gorm:"type:date;unique;not null"`
	Visits int       `gorm:"default:0"`
}

func (DailyStat) TableName() string {
	return "daily_stat"
}

type GlobalStat struct {
	ID          uint `gorm:"primaryKey"`
	TotalVisits int  `gorm:"default:0"`
}

func (GlobalStat) TableName() string {
	return "global_stat"
}

type Comment struct {
	ID          uint      `gorm:"primaryKey"`
	Content     string    `gorm:"not null;type:text"`
	AuthorName  string    `gorm:"not null;size:80"`
	AuthorEmail string    `gorm:"not null;size:120"`
	CreatedAt   time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	PostID      uint      `gorm:"not null"`
	IsApproved  bool      `gorm:"default:false"`
	Post        Post      `gorm:"foreignKey:PostID"`
}

func (Comment) TableName() string {
	return "comment"
}

type Contact struct {
	ID        uint      `gorm:"primaryKey"`
	Name      string    `gorm:"not null;size:80"`
	Email     string    `gorm:"not null;size:120"`
	Subject   string    `gorm:"size:200"`
	Message   string    `gorm:"not null;type:text"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	IsRead    bool      `gorm:"default:false"`
}

func (Contact) TableName() string {
	return "contact"
}
