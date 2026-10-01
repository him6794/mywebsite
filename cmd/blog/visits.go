package main

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"myblog/internal/models"
)

const lifetimeVisitsRowID uint = 1

func utcStatDate(now time.Time) time.Time {
	utc := now.UTC()
	return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
}

func recordVisitAt(db *gorm.DB, now time.Time) error {
	date := utcStatDate(now)
	return db.Transaction(func(tx *gorm.DB) error {
		daily := models.DailyStat{Date: date, Visits: 1}
		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "date"}},
			DoUpdates: clause.Assignments(map[string]interface{}{"visits": gorm.Expr("visits + 1")}),
		}).Create(&daily).Error; err != nil {
			return err
		}

		var lifetime models.GlobalStat
		err := tx.Order("id").First(&lifetime).Error
		if err == gorm.ErrRecordNotFound {
			missing := models.GlobalStat{ID: lifetimeVisitsRowID, TotalVisits: 1}
			return tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "id"}},
				DoUpdates: clause.Assignments(map[string]interface{}{"total_visits": gorm.Expr("total_visits + 1")}),
			}).Create(&missing).Error
		}
		if err != nil {
			return err
		}
		return tx.Model(&models.GlobalStat{}).Where("id = ?", lifetime.ID).UpdateColumn("total_visits", gorm.Expr("total_visits + 1")).Error
	})
}

func registerVisitRoute(api *gin.RouterGroup, db *gorm.DB) {
	api.POST("/visit", func(c *gin.Context) {
		if err := recordVisitAt(db, time.Now()); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to record visit."})
			return
		}
		c.Status(http.StatusNoContent)
	})
}
