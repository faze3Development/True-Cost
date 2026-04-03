package scraper

import "testing"

func TestNormalizeImageURL(t *testing.T) {
	base := "https://example.com/listings/123"

	tests := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "empty",
			in:   "",
			want: "",
		},
		{
			name: "relative root",
			in:   "/assets/hero-bg.jpg",
			want: "https://example.com/assets/hero-bg.jpg",
		},
		{
			name: "relative path",
			in:   "images/hero.jpg",
			want: "https://example.com/listings/images/hero.jpg",
		},
		{
			name: "protocol relative",
			in:   "//cdn.example.org/hero.jpg",
			want: "https://cdn.example.org/hero.jpg",
		},
		{
			name: "absolute https",
			in:   "https://img.example.org/hero.jpg?x=1",
			want: "https://img.example.org/hero.jpg?x=1",
		},
		{
			name: "absolute http",
			in:   "http://img.example.org/hero.jpg",
			want: "http://img.example.org/hero.jpg",
		},
		{
			name: "data uri ignored",
			in:   "data:image/png;base64,AAAA",
			want: "",
		},
		{
			name: "blob uri ignored",
			in:   "blob:https://example.com/abcd",
			want: "",
		},
		{
			name: "javascript uri ignored",
			in:   "javascript:void(0)",
			want: "",
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeImageURL(base, tt.in)
			if got != tt.want {
				t.Fatalf("normalizeImageURL() = %q, want %q", got, tt.want)
			}
		})
	}
}
