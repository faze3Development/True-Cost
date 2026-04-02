package db

import (
	"fmt"

	"github.com/faze3Development/true-cost/Server/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Seed Tiers inserts the default subscription tiers into the database.
func SeedTiers(db *gorm.DB) error {
	tiers := []models.SubscriptionTier{
		{
			ID:         "free",
			Name:       "TrueCost Free",
			Priority:   0,
			MaxReports: 5,
			MaxAlerts:  2,
			PriceMonth: 0.0,
		},
		{
			ID:         "pro",
			Name:       "TrueCost Pro",
			Priority:   1,
			MaxReports: -1, // -1 could mean unlimited
			MaxAlerts:  -1,
			PriceMonth: 30.0,
		},
		{
			ID:         "enterprise",
			Name:       "TrueCost Enterprise",
			Priority:   2,
			MaxReports: -1,
			MaxAlerts:  -1,
			PriceMonth: 99.0,
		},
	}

	for _, tier := range tiers {
		if err := db.Where(&models.SubscriptionTier{ID: tier.ID}).FirstOrCreate(&tier).Error; err != nil {
			return fmt.Errorf("failed to seed tier %s: %w", tier.ID, err)
		}
	}
	
	zap.L().Info("Successfully seeded subscription tiers")
	return nil
}

// SeedProperties inserts mock properties into the database to connect the frontend to real data models.
// SeedProperties inserts mock properties into the database to connect the frontend to real data models.
func SeedProperties(db *gorm.DB) error {
	properties := []struct {
		Prop   models.Property
		Fees   models.FeeStructure
		Unit   models.Unit
		Price  models.PriceRecord
	}{
		{
			Prop: models.Property{
				Name:       "The Sterling Modern",
				Address:    "123 Main St",
				City:       "New York",
				State:      "NY",
				ZipCode:    "10001",
				Latitude:   40.7484,
				Longitude:  -73.9857,
				WebsiteURL: "https://example.com/sterling",
				ImageURL:   "https://lh3.googleusercontent.com/aida-public/AB6AXuBD6p6n9NeWSXLUm2-7EogndTtMgtzLlWiA06U4F4ke891NJghJ7rtZoB4q6xgyZqoF_I3Bg36iT3ZGY9fMK9_vZRqZmVebcx1TqivnFvJh5ocTKb5DcTJ1asgiMbI1iS2BUkh63I0lobtNCp49LJPx614obQ1863goPNz-En1CirRf0gusZMjU02hnyO_B8jl7pxlwiO4M4uhSqJokclMSSSuCbXW80gml6oxpitRWjODje-g4cWTP91D0nvA2lcqttzlhBqrKAeQE",
			},
			Fees: models.FeeStructure{TrashFee: 0, AmenityFee: 0, PackageFee: 0},
			Unit: models.Unit{UnitNumber: "1A", FloorplanName: "Studio", Bedrooms: 0, Bathrooms: 1, SquareFeet: 500},
			Price: models.PriceRecord{AdvertisedRent: 3000, EffectiveRent: 2400}, // TrueCost is 2400 (which differs from original mock showing 3000 advertised, 2400 truecost, but the formula handles effective + fees) Wait, TrueCost = Effective + Fees. In original it was advertised = 3000, trueCost = 2400. Let's replicate that.
		},
		{
			Prop: models.Property{
				Name:       "Beacon Hill Residences",
				Address:    "456 Beacon Way",
				City:       "New York",
				State:      "NY",
				ZipCode:    "10011",
				Latitude:   40.7411,
				Longitude:  -74.0049,
				WebsiteURL: "https://example.com/beacon",
				ImageURL:   "https://lh3.googleusercontent.com/aida-public/AB6AXuBxmdJtD6O8QNazfsCB1C0i6Xq9vZmn2zufrs8JRD6EIEBu6BDQyCLolxcoTv7DE5f1tz_SabOutGq9ePHv2lylr-IY4xfLg8Yc47_IC-vprS2yih3MXtVKrjj4O5c6zd7V2z7azHV5khQ_Nbz2Id2biDO7E6cHDmvIDwvJ0SYGWtfznNCbU_JbLV_9DEmPxIKfImBL5ZvWOpBKduvH7M3HHiEeOTaCUpHtVRBdNn7n97pmlwvShdF56QVyioNDGOYamGLFHbTKPxr_",
			},
			Fees: models.FeeStructure{TrashFee: 25, AmenityFee: 75, PackageFee: 0},
			Unit: models.Unit{UnitNumber: "2B", FloorplanName: "1 Bed", Bedrooms: 1, Bathrooms: 1, SquareFeet: 700},
			Price: models.PriceRecord{AdvertisedRent: 4200, EffectiveRent: 3850}, // TrueCost = 3850 + 100 = 3950
		},
		{
			Prop: models.Property{
				Name:       "Emerald Loft Park",
				Address:    "789 Emerald St",
				City:       "New York",
				State:      "NY",
				ZipCode:    "10002",
				Latitude:   40.7150,
				Longitude:  -73.9840,
				WebsiteURL: "https://example.com/emerald",
				ImageURL:   "https://lh3.googleusercontent.com/aida-public/AB6AXuB230vsf-gTtWfom-zxWikOBCGbKxxlv7qTei9HRwwqsnhuz8KofuUHQEdSyebUEuSj7y8UFQHQlIXoiKpvRFEst1TXCc2UvLENgVzQQUKuL0ojUVTrIrT7W9Mc7umDHNUBYWeAtKpzGvqIqMawCDzNc1d-5afHZJ2W2UqYeHbyQ0vShcViaeRnY1zeHyHhk0Flt7Dc_dyM3_pgaG1Z_ykP-31imXQkqhGoRNnZvtDbJxhHJEsOW9Bw042z_tmuvbR1Nd5TjvlsVVhC",
			},
			Fees: models.FeeStructure{TrashFee: 50, AmenityFee: 0, PackageFee: 0},
			Unit: models.Unit{UnitNumber: "PH1", FloorplanName: "Penthouse", Bedrooms: 2, Bathrooms: 2, SquareFeet: 1200},
			Price: models.PriceRecord{AdvertisedRent: 2100, EffectiveRent: 1800}, // TrueCost = 1800 + 50 = 1850
		},
	}

	for _, p := range properties {
		if err := db.Where(models.Property{Name: p.Prop.Name}).FirstOrCreate(&p.Prop).Error; err != nil {
			return fmt.Errorf("failed to seed property %s: %w", p.Prop.Name, err)
		}

		p.Fees.PropertyID = p.Prop.ID
		if err := db.Where(models.FeeStructure{PropertyID: p.Prop.ID}).FirstOrCreate(&p.Fees).Error; err != nil {
			return err
		}

		p.Unit.PropertyID = p.Prop.ID
		if err := db.Where(models.Unit{PropertyID: p.Prop.ID, UnitNumber: p.Unit.UnitNumber}).FirstOrCreate(&p.Unit).Error; err != nil {
			return err
		}

		p.Price.UnitID = p.Unit.ID
		if err := db.Where(models.PriceRecord{UnitID: p.Unit.ID}).FirstOrCreate(&p.Price).Error; err != nil {
			return err
		}
	}

	zap.L().Info("Successfully seeded properties")
	return nil
}
