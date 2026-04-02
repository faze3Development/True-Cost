package auth

import (
	"context"
	"fmt"

	firebase "firebase.google.com/go/v4"
	firebaseAuth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

// Client wraps the Firebase Authentication API
type Client struct {
	auth *firebaseAuth.Client
}

// NewClient initializes a new Firebase client using a service account or application default credentials
func NewClient(ctx context.Context, credentialsFile string) (*Client, error) {
	opts := make([]option.ClientOption, 0, 1)
	if credentialsFile != "" {
		opts = append(opts, option.WithCredentialsFile(credentialsFile))
	}

	// Initialize Firebase App
	app, err := firebase.NewApp(ctx, nil, opts...)
	if err != nil {
		if credentialsFile == "" {
			// Try again without opts if defaulting
			app, err = firebase.NewApp(ctx, nil)
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

// VerifyIDToken verifies the Firebase JWT token and returns the decoded token
func (c *Client) VerifyIDToken(ctx context.Context, idToken string) (*firebaseAuth.Token, error) {
	// Using VerifyIDTokenAndCheckRevoked prevents revoked users from maintaining access
	return c.auth.VerifyIDTokenAndCheckRevoked(ctx, idToken)
}

// GetUser retrieves the full user record from Firebase
func (c *Client) GetUser(ctx context.Context, uid string) (*firebaseAuth.UserRecord, error) {
	return c.auth.GetUser(ctx, uid)
}
