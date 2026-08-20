package local

import (
	"context"
	"image"
	"image/color"
	"image/jpeg"
	"os"
	"path/filepath"
	"testing"

	"github.com/OpenListTeam/OpenList/v4/internal/conf"
	"github.com/OpenListTeam/OpenList/v4/internal/model"
)

func TestRemoveDeletesThumbCache(t *testing.T) {
	root := t.TempDir()
	cacheDir := filepath.Join(root, "thumbs")
	if err := os.Mkdir(cacheDir, 0o755); err != nil {
		t.Fatal(err)
	}
	filePath := filepath.Join(root, "photo.jpg")
	if err := os.WriteFile(filePath, []byte("image"), 0o666); err != nil {
		t.Fatal(err)
	}

	driver := &Local{
		Addition: Addition{
			ThumbCacheFolder: cacheDir,
		},
	}
	thumbPath := driver.thumbCachePath(filePath)
	if err := os.WriteFile(thumbPath, []byte("thumb"), 0o666); err != nil {
		t.Fatal(err)
	}

	err := driver.Remove(context.Background(), &model.Object{
		Path: filePath,
		Name: filepath.Base(filePath),
	})
	if err != nil {
		t.Fatal(err)
	}

	if _, err = os.Stat(thumbPath); !os.IsNotExist(err) {
		t.Fatalf("expected thumb cache to be removed, got %v", err)
	}
}

func TestGetThumbUsesSameNameJpgCoverForVideo(t *testing.T) {
	conf.SlicesMap[conf.VideoTypes] = []string{"mp4"}
	conf.SlicesMap[conf.ImageTypes] = []string{"jpg", "jpeg"}

	root := t.TempDir()
	cacheDir := filepath.Join(root, "thumbs")
	if err := os.Mkdir(cacheDir, 0o755); err != nil {
		t.Fatal(err)
	}
	videoPath := filepath.Join(root, "movie.mp4")
	if err := os.WriteFile(videoPath, []byte("not a real video"), 0o666); err != nil {
		t.Fatal(err)
	}
	coverPath := filepath.Join(root, "movie.jpg")
	coverFile, err := os.Create(coverPath)
	if err != nil {
		t.Fatal(err)
	}
	img := image.NewRGBA(image.Rect(0, 0, 8, 8))
	for y := 0; y < 8; y++ {
		for x := 0; x < 8; x++ {
			img.Set(x, y, color.RGBA{R: 255, A: 255})
		}
	}
	if err := jpeg.Encode(coverFile, img, nil); err != nil {
		coverFile.Close()
		t.Fatal(err)
	}
	if err := coverFile.Close(); err != nil {
		t.Fatal(err)
	}

	driver := &Local{
		Addition: Addition{
			ThumbCacheFolder: cacheDir,
		},
	}
	buf, thumbPath, err := driver.getThumb(&model.Object{
		Path: videoPath,
		Name: filepath.Base(videoPath),
	})
	if err != nil {
		t.Fatal(err)
	}
	if buf == nil {
		t.Fatal("expected thumbnail buffer")
	}
	if thumbPath != nil {
		t.Fatalf("expected generated thumbnail buffer, got cached path %q", *thumbPath)
	}
	if _, err := os.Stat(driver.thumbCachePath(coverPath)); err != nil {
		t.Fatalf("expected cover thumbnail cache to exist: %v", err)
	}
	if _, err := os.Stat(driver.thumbCachePath(videoPath)); !os.IsNotExist(err) {
		t.Fatalf("expected video thumbnail cache to be skipped, got %v", err)
	}
}
