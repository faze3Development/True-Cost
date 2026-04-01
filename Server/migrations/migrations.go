package migrations

import (
	"fmt"
	"time"

	"github.com/go-gormigrate/gormigrate/v2"
	"gorm.io/gorm"

	"github.com/faze3Development/true-cost/Server/internal/models"
)

// Run applies all pending migrations. It is safe to call on every start (idempotent).
func Run(db *gorm.DB) error {
	// clone default options so we can override without touching the shared singleton
	opts := *gormigrate.DefaultOptions
	opts.TableName = "schema_migrations"
	opts.IDColumnSize = 64
	opts.UseTransaction = true
	opts.ValidateUnknownMigrations = true

	m := gormigrate.New(db, &opts, []*gormigrate.Migration{
		{
			ID: "20240331_0001_init",
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(
					&models.Property{},
					&models.FeeStructure{},
					&models.Unit{},
					&models.PriceRecord{},
				)
			},
			Rollback: func(tx *gorm.DB) error {
				return tx.Migrator().DropTable(
					&models.PriceRecord{},
					&models.Unit{},
					&models.FeeStructure{},
					&models.Property{},
				)
			},
		},
	})

	m.InitSchema(func(tx *gorm.DB) error {
		if err := tx.AutoMigrate(
			&models.Property{},
			&models.FeeStructure{},
			&models.Unit{},
			&models.PriceRecord{},
		); err != nil {
			return fmt.Errorf("init schema: %w", err)
		}
		return nil
	})

	if err := m.Migrate(); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}

	return nil
}

// TimestampID is a helper to generate sortable IDs if you add new migrations.
func TimestampID(suffix string) string {
	return time.Now().UTC().Format("20060102_150405") + "_" + suffix
}
