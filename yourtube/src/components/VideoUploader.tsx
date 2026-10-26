import { useUser } from "@/lib/AuthContext";
import { Check, FileVideo, Upload, X } from "lucide-react";
import React, {
  ChangeEvent,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import axiosInstance from "@/lib/axiosinstance";

const categories = [
  "Music",
  "Gaming",
  "Movies",
  "News",
  "Sports",
  "Technology",
  "Comedy",
  "Education",
  "Science",
  "Travel",
  "Food",
  "Fashion",
];

const VideoUploader = ({
  channelId,
  channelName,
}: any) => {
  const { user } = useUser();

  const [isUploading, setIsUploading] =
    useState(false);

  const [uploadProgress, setUploadProgress] =
    useState(0);

  const [videoFile, setVideoFile] =
    useState<File | null>(null);

  const [videoTitle, setVideoTitle] =
    useState("");

  const [videoCategory, setVideoCategory] =
    useState("Music");

  const [uploadComplete, setUploadComplete] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const handlefilechange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;

    if (files && files.length > 0) {
      const file = files[0];

      if (!file.type.startsWith("video/")) {
        toast.error(
          "Please upload a valid video file."
        );
        return;
      }

      if (
        file.size >
        100 * 1024 * 1024
      ) {
        toast.error(
          "File size exceeds 100MB limit."
        );
        return;
      }

      setVideoFile(file);

      if (!videoTitle) {
        setVideoTitle(file.name);
      }
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setVideoTitle("");
    setVideoCategory("Music");
    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const cancelUpload = () => {
    if (isUploading) {
      toast.error(
        "Your video upload has been cancelled"
      );
    }
  };

  const handleUpload = async () => {
    if (
      !videoFile ||
      !videoTitle.trim() ||
      !user?._id ||
      !channelName ||
      !videoCategory
    ) {
      toast.error(
        "File, title, category, or channel information is missing"
      );
      return;
    }

    const formdata = new FormData();

    formdata.append("file", videoFile);
    formdata.append(
      "videotitle",
      videoTitle.trim()
    );
    formdata.append(
      "videochanel",
      channelName
    );
    formdata.append(
      "uploader",
      user._id
    );
    formdata.append(
      "category",
      videoCategory
    );

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const res =
        await axiosInstance.post(
          "/video/upload",
          formdata,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },

            onUploadProgress: (
              progressEvent: any
            ) => {
              if (
                progressEvent.total
              ) {
                const progress =
                  Math.round(
                    (progressEvent.loaded *
                      100) /
                    progressEvent.total
                  );

                setUploadProgress(
                  progress
                );
              }
            },
          }
        );

      console.log(
        "Upload response:",
        res.data
      );

      setUploadComplete(true);

      toast.success(
        "Video uploaded successfully"
      );

      setTimeout(() => {
        resetForm();
      }, 1000);
    } catch (error) {
      console.error(
        "Error uploading video:",
        error
      );

      toast.error(
        "There was an error uploading your video. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-lg p-6 border border-border">

      <h2 className="text-xl font-semibold mb-4">
        Upload a video
      </h2>

      <div className="space-y-4">

        {!videoFile ? (
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-accent transition-colors"
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-2" />

            <p className="text-lg font-medium">
              Drag and drop video files to upload
            </p>

            <p className="text-sm text-muted-foreground mt-1">
              or click to select files
            </p>

            <p className="text-xs text-muted-foreground mt-4">
              MP4, WebM, MOV or AVI • Up to 100MB
            </p>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*"
              onChange={handlefilechange}
            />
          </div>
        ) : (
          <div className="space-y-4">

            {/* Selected file */}

            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">

              <div className="bg-blue-100 dark:bg-blue-950 p-2 rounded-md">
                <FileVideo className="w-6 h-6 text-blue-600" />
              </div>

              <div className="flex-1 min-w-0">

                <p className="font-medium truncate">
                  {videoFile.name}
                </p>

                <p className="text-sm text-muted-foreground">
                  {(
                    videoFile.size /
                    (1024 * 1024)
                  ).toFixed(2)}{" "}
                  MB
                </p>

              </div>

              {!isUploading &&
                !uploadComplete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={resetForm}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}

              {uploadComplete && (
                <div className="bg-green-100 dark:bg-green-950 p-1 rounded-full">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              )}

            </div>

            {/* Title */}

            <div className="space-y-2">

              <Label htmlFor="title">
                Title (required)
              </Label>

              <Input
                id="title"
                value={videoTitle}
                onChange={(e) =>
                  setVideoTitle(
                    e.target.value
                  )
                }
                placeholder="Add a title that describes your video"
                disabled={
                  isUploading ||
                  uploadComplete
                }
              />

            </div>

            {/* Category */}

            <div className="space-y-2">

              <Label htmlFor="category">
                Category (required)
              </Label>

              <select
                id="category"
                value={videoCategory}
                onChange={(e) =>
                  setVideoCategory(
                    e.target.value
                  )
                }
                disabled={
                  isUploading ||
                  uploadComplete
                }
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>

            </div>

            {/* Progress */}

            {isUploading && (
              <div className="space-y-2">

                <div className="flex justify-between text-sm">

                  <span>
                    Uploading...
                  </span>

                  <span>
                    {uploadProgress}%
                  </span>

                </div>

                <Progress
                  value={uploadProgress}
                  className="h-2"
                />

              </div>
            )}

            {/* Buttons */}

            <div className="flex justify-end gap-3">

              {!uploadComplete && (
                <>
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    disabled={
                      isUploading
                    }
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={
                      handleUpload
                    }
                    disabled={
                      isUploading ||
                      !videoTitle.trim() ||
                      !videoCategory
                    }
                  >
                    {isUploading
                      ? "Uploading..."
                      : "Upload"}
                  </Button>
                </>
              )}

            </div>

          </div>
        )}

      </div>

    </div>
  );
};

export default VideoUploader;