import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Download,
  Users,
} from "lucide-react";

import Link from "next/link";
import React, { useState } from "react";

import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";

const Sidebar = () => {
  const { user } = useUser();

  const [isdialogeopen, setisdialogeopen] = useState(false);

  return (
    <aside className="w-64 bg-background text-foreground border-r border-border min-h-screen p-2">
      <nav className="space-y-1">
        {/* Home */}
        <Link href="/">
          <Button
            variant="ghost"
            className="w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Home className="w-5 h-5 mr-3" />
            Home
          </Button>
        </Link>

        {/* Explore */}
        <Link href="/explore">
          <Button
            variant="ghost"
            className="w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Compass className="w-5 h-5 mr-3" />
            Explore
          </Button>
        </Link>

        {/* Subscriptions */}
        <Link href="/subscriptions">
          <Button
            variant="ghost"
            className="w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <PlaySquare className="w-5 h-5 mr-3" />
            Subscriptions
          </Button>
        </Link>

        {/* Watch Party */}
        <Link href="/watch-party">
          <Button
            variant="ghost"
            className="w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Users className="w-5 h-5 mr-3" />
            Watch Party
          </Button>
        </Link>

        {user && (
          <div className="border-t border-border pt-2 mt-2">
            {/* History */}
            <Link href="/history">
              <Button
                variant="ghost"
                className="w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <History className="w-5 h-5 mr-3" />
                History
              </Button>
            </Link>

            {/* Liked videos */}
            <Link href="/liked">
              <Button
                variant="ghost"
                className="w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <ThumbsUp className="w-5 h-5 mr-3" />
                Liked videos
              </Button>
            </Link>

            {/* Downloads */}
            <Link href="/downloads">
              <Button
                variant="ghost"
                className="w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Download className="w-5 h-5 mr-3" />
                Downloads
              </Button>
            </Link>

            {/* Watch later */}
            <Link href="/watch-later">
              <Button
                variant="ghost"
                className="w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Clock className="w-5 h-5 mr-3" />
                Watch later
              </Button>
            </Link>

            {/* Your channel */}
            {user?.channelname ? (
              <Link href={`/channel/${user._id}`}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <User className="w-5 h-5 mr-3" />
                  Your channel
                </Button>
              </Link>
            ) : (
              <div className="px-2 py-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setisdialogeopen(true)}
                >
                  Create Channel
                </Button>
              </div>
            )}
          </div>
        )}
      </nav>

      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </aside>
  );
};

export default Sidebar;