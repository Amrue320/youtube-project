
import React from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { Button } from "./ui/button";

interface ChanneldialogueProps {
  isopen: boolean;
  onclose: () => void;
  mode: string;
}

const Channeldialogue: React.FC<ChanneldialogueProps> = ({
  isopen,
  onclose,
  mode,
}) => {
  const router = useRouter();
  const { user } = useUser();

  if (!isopen) return null;

  const handleCreateChannel = () => {
    if (!user) {
      alert("User not logged in");
      return;
    }

    if (!user._id) {
      alert("User ID is missing");
      return;
    }

    onclose();
    router.push(`/ channel / ${user._id} `);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={onclose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-lg bg-background p-6 text-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-semibold">
          {mode === "create" ? "Create your channel" : "Channel"}
        </h2>

        <p className="mb-5 text-sm text-muted-foreground">
          Create your channel to start sharing videos.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onclose}>
            Cancel
          </Button>

          <Button onClick={handleCreateChannel}>
            Create Channel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Channeldialogue;