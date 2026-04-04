package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	firebase "firebase.google.com/go/v4"
	firebaseAuth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

// Client wraps the Firebase Authentication API
type Client struct {
	auth *firebaseAuth.Client
}

// NewClient initializes a new Firebase client using a service account or application default credentials
func NewClient(ctx context.Context, projectID, credentialsFile, credentialsJSON string) (*Client, error) {
	opts := make([]option.ClientOption, 0, 2)
	if credentialsFile != "" {
		bytes, err := os.ReadFile(credentialsFile)
		if err != nil {
			return nil, fmt.Errorf("unable to read firebase credentials file: %w", err)
		}
		if err := validateServiceAccountCredentials(bytes); err != nil {
			return nil, fmt.Errorf("invalid firebase credentials file %s: %w", credentialsFile, err)
		}
		opts = append(opts, option.WithAuthCredentialsFile(option.ServiceAccount, credentialsFile))
	}
	if credentialsJSON != "" {
		jsonBytes := []byte(credentialsJSON)
		if err := validateServiceAccountCredentials(jsonBytes); err != nil {
			return nil, fmt.Errorf("invalid firebase credentials json: %w", err)
		}
		opts = append(opts, option.WithAuthCredentialsJSON(option.ServiceAccount, jsonBytes))
	}

	config := &firebase.Config{}
	if projectID != "" {
		config.ProjectID = projectID
	} else if projectID := os.Getenv("GOOGLE_CLOUD_PROJECT"); projectID != "" {
		config.ProjectID = projectID
	} else if projectID := os.Getenv("GCLOUD_PROJECT"); projectID != "" {
		config.ProjectID = projectID
	}

	var app *firebase.App
	var err error

	if config.ProjectID != "" {
		app, err = firebase.NewApp(ctx, config, opts...)
	} else {
		app, err = firebase.NewApp(ctx, nil, opts...)
	}

	if err != nil {
		if credentialsFile == "" && credentialsJSON == "" {
			// Try again without opts if defaulting
			if config.ProjectID != "" {
				app, err = firebase.NewApp(ctx, config)
			} else {
				app, err = firebase.NewApp(ctx, nil)
			}
		}
		if err != nil {
			return nil, fmt.Errorf("error initializing firebase app: %w", err)
		}
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("error getting auth client: %w", err)
	}

	return &Client{
		auth: authClient,
	}, nil
}

func validateServiceAccountCredentials(raw []byte) error {
	if strings.TrimSpace(string(raw)) == "" {
		return fmt.Errorf("credentials content is empty")
	}

	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return fmt.Errorf("credentials json is not valid json: %w", err)
	}

	credType, _ := payload["type"].(string)
	if credType != "service_account" {
		return fmt.Errorf("credentials type must be service_account, got %q", credType)
	}

	return nil
}

// VerifyIDToken verifies the Firebase JWT token and returns the decoded token
func (c *Client) VerifyIDToken(ctx context.Context, idToken string) (*firebaseAuth.Token, error) {
	// Using VerifyIDTokenAndCheckRevoked prevents revoked users from maintaining access
	return c.auth.VerifyIDTokenAndCheckRevoked(ctx, idToken)
}

// GetUser retrieves the full user record from Firebase
func (c *Client) GetUser(ctx context.Context, uid string) (*firebaseAuth.UserRecord, error) {
	return c.auth.GetUser(ctx, uid)
}
