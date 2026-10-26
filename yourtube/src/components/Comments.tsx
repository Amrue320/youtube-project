
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Flag,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

interface Comment {
  _id: string;
  videoid: string;
  userid: string | { _id: string };
  commentbody: string;
  usercommented?: string;
  commentedon?: string;
  parentComment?: string | { _id: string } | null;
  createdAt?: string;
  likes?: string[];
  dislikes?: string[];
}

const MAX_COMMENT_LENGTH = 500;

const REPORT_REASONS = [
  "Abusive or hateful content",
  "Harassment or bullying",
  "Spam or misleading content",
  "Inappropriate content",
  "Other",
];

function idOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return "";
}

function validateComment(text: string): string | null {
  const value = text.trim();

  if (!value) return "Comment cannot be empty.";
  if (value.length > MAX_COMMENT_LENGTH) {
    return `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters.`;
  }
  if (/^(.)\1{7,}$/s.test(value)) {
    return "Please avoid repeated characters.";
  }
  if (/^[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~\s]+$/.test(value)) {
    return "Please enter a meaningful comment.";
  }
  if (/(.)\1{9,}/s.test(value)) {
    return "Your comment contains too many repeated characters.";
  }

  return null;
}

const Comments = ({ videoId }: { videoId: string }) => {
  const { user } = useUser();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [reactingTo, setReactingTo] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    if (!videoId) {
      setComments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.get(`/comment/${videoId}`);
      setComments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Load comments error:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const topLevelComments = useMemo(
    () => comments.filter((item) => !idOf(item.parentComment)),
    [comments]
  );

  const getReplies = (commentId: string) =>
    comments.filter((item) => idOf(item.parentComment) === commentId);

  const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || fallback;

  const submitComment = async (text: string, parentComment: string | null) => {
    if (!user) {
      toast.error("Please sign in to comment");
      return false;
    }

    const validationError = validateComment(text);
    if (validationError) {
      toast.error(validationError);
      return false;
    }

    try {
      await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        commentbody: text.trim(),
        parentComment,
      });

      return true;
    } catch (error: any) {
      console.error("Post comment error:", error);
      toast.error(getErrorMessage(error, "Failed to post comment"));
      return false;
    }
  };

  const handleSubmitComment = async () => {
    setIsSubmitting(true);
    try {
      const success = await submitComment(newComment, null);
      if (success) {
        setNewComment("");
        toast.success("Comment added");
        await loadComments();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (commentId: string) => {
    setIsReplySubmitting(true);
    try {
      const success = await submitComment(replyText, commentId);
      if (success) {
        setReplyText("");
        setReplyingTo(null);
        setExpandedReplies((previous) => ({ ...previous, [commentId]: true }));
        toast.success("Reply added");
        await loadComments();
      }
    } finally {
      setIsReplySubmitting(false);
    }
  };

  const handleEdit = (item: Comment) => {
    setEditingCommentId(item._id);
    setEditText(item.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editingCommentId) return;

    const validationError = validateComment(editText);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await axiosInstance.post(`/comment/editcomment/${editingCommentId}`, {
        commentbody: editText.trim(),
      });
      toast.success("Comment updated");
      setEditingCommentId(null);
      setEditText("");
      await loadComments();
    } catch (error: any) {
      console.error("Update comment error:", error);
      toast.error(getErrorMessage(error, "Failed to update comment"));
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this comment? Any replies to it may also be deleted."
      )
    ) {
      return;
    }

    try {
      await axiosInstance.delete(`/comment/deletecomment/${id}`);
      toast.success("Comment deleted");

      if (editingCommentId === id) {
        setEditingCommentId(null);
        setEditText("");
      }

      await loadComments();
    } catch (error: any) {
      console.error("Delete comment error:", error);
      toast.error(getErrorMessage(error, "Failed to delete comment"));
    }
  };

  const handleReport = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to report a comment");
      return;
    }

    const selectedReason = window.prompt(
      `Choose a report reason by entering its number:\n\n${REPORT_REASONS.map(
        (reason, index) => `${index + 1}. ${reason}`
      ).join("\n")}`
    );

    if (selectedReason === null) return;

    const reasonNumber = Number(selectedReason.trim());
    if (
      !Number.isInteger(reasonNumber) ||
      reasonNumber < 1 ||
      reasonNumber > REPORT_REASONS.length
    ) {
      toast.error("Please select a valid report reason");
      return;
    }

    try {
      await axiosInstance.post(`/comment/report/${commentId}`, {
        reason: REPORT_REASONS[reasonNumber - 1],
      });
      toast.success("Comment reported for review");
    } catch (error: any) {
      console.error("Report comment error:", error);
      toast.error(getErrorMessage(error, "Failed to report comment"));
    }
  };

  const handleReaction = async (
    item: Comment,
    reaction: "like" | "dislike"
  ) => {
    if (!user) {
      toast.error("Please sign in to react to comments");
      return;
    }

    setReactingTo(item._id);
    try {
      await axiosInstance.post(`/comment/reaction/${item._id}`, { reaction });
      await loadComments();
    } catch (error: any) {
      console.error("Comment reaction error:", error);
      toast.error(getErrorMessage(error, "Failed to update reaction"));
    } finally {
      setReactingTo(null);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((previous) => ({
      ...previous,
      [commentId]: !previous[commentId],
    }));
  };

  const formatCommentDate = (dateValue?: string) => {
    if (!dateValue) return "Recently";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Recently";

    return formatDistanceToNow(date, { addSuffix: true });
  };

  const renderComment = (item: Comment, isReply = false) => {
    const owner = idOf(item.userid) === String(user?._id);
    const likes = item.likes ?? [];
    const dislikes = item.dislikes ?? [];
    const liked = user ? likes.some((id) => idOf(id) === String(user._id)) : false;
    const disliked = user
      ? dislikes.some((id) => idOf(id) === String(user._id))
      : false;

    return (
      <div key={item._id} className={`flex gap-3 ${isReply ? "" : "gap-4"}`}>
        <Avatar className={`${isReply ? "h-8 w-8" : "h-10 w-10"} flex-shrink-0`}>
          <AvatarFallback>
            {(item.usercommented || "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {item.usercommented || "User"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatCommentDate(item.commentedon || item.createdAt)}
            </span>
          </div>

          {editingCommentId === item._id ? (
            <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
                maxLength={MAX_COMMENT_LENGTH}
                className="bg-background text-foreground"
              />
              <p className="text-xs text-muted-foreground">
                {editText.length} / {MAX_COMMENT_LENGTH} characters
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleUpdateComment} disabled={!editText.trim()}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditText("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap break-words text-sm">
                {item.commentbody}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  aria-label="Like comment"
                  title="Like"
                  disabled={reactingTo === item._id}
                  onClick={() => void handleReaction(item, "like")}
                  className={`flex items-center gap-1 text-sm hover:text-foreground ${liked ? "font-semibold text-blue-600" : "text-muted-foreground"
                    }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  {likes.length}
                </button>

                <button
                  type="button"
                  aria-label="Dislike comment"
                  title="Dislike"
                  disabled={reactingTo === item._id}
                  onClick={() => void handleReaction(item, "dislike")}
                  className={`flex items-center gap-1 text-sm hover:text-foreground ${disliked ? "font-semibold text-blue-600" : "text-muted-foreground"
                    }`}
                >
                  <ThumbsDown className="h-4 w-4" />
                  {dislikes.length}
                </button>

                {user && !isReply && (
                  <button
                    type="button"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setReplyingTo(replyingTo === item._id ? null : item._id);
                      setReplyText("");
                    }}
                  >
                    Reply
                  </button>
                )}

                {owner ? (
                  <>
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:underline"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => void handleDelete(item._id)}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  user && (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-red-600"
                      onClick={() => void handleReport(item._id)}
                    >
                      <Flag className="h-4 w-4" />
                      Report
                    </button>
                  )
                )}
              </div>

              {!isReply && replyingTo === item._id && user && (
                <div className="mt-4 space-y-2">
                  <Textarea
                    autoFocus
                    placeholder={`Reply to ${item.usercommented || "this comment"}...`}
                    value={replyText}
                    maxLength={MAX_COMMENT_LENGTH}
                    onChange={(event) => setReplyText(event.target.value)}
                    className="min-h-[70px] bg-background"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={!replyText.trim() || isReplySubmitting}
                      onClick={() => void handleSubmitReply(item._id)}
                    >
                      {isReplySubmitting ? "Replying..." : "Reply"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading comments...</div>;
  }

  return (
    <div className="space-y-6 text-foreground">
      <h2 className="text-xl font-semibold">
        {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
      </h2>

      {user ? (
        <div className="flex gap-4">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Add a public comment..."
              value={newComment}
              maxLength={MAX_COMMENT_LENGTH}
              onChange={(event) => setNewComment(event.target.value)}
              className="min-h-[90px] resize-none rounded-none border-0 border-b-2 bg-background text-foreground focus-visible:ring-0"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {newComment.length} / {MAX_COMMENT_LENGTH} characters
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setNewComment("")}
                  disabled={!newComment}
                >
                  Clear
                </Button>
                <Button
                  onClick={() => void handleSubmitComment()}
                  disabled={!newComment.trim() || isSubmitting}
                >
                  {isSubmitting ? "Posting..." : "Comment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sign in to post a comment or reply.
        </p>
      )}

      <div className="space-y-6">
        {topLevelComments.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            No comments yet.
          </div>
        ) : (
          topLevelComments.map((item) => {
            const replies = getReplies(item._id);
            const showReplies = Boolean(expandedReplies[item._id]);

            return (
              <div key={item._id} className="space-y-3">
                {renderComment(item)}

                {replies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleReplies(item._id)}
                    className="ml-12 mt-2 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    {showReplies ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <MessageCircle className="h-4 w-4" />
                    {showReplies
                      ? "Hide replies"
                      : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                  </button>
                )}

                {showReplies && replies.length > 0 && (
                  <div className="ml-12 space-y-5 border-l-2 border-border pl-4">
                    {replies.map((reply) => renderComment(reply, true))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Comments;
