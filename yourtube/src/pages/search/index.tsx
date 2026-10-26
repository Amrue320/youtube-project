import SearchResult from "@/components/SearchResult";
import { useRouter } from "next/router";
import React, { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const index = () => {
  const router = useRouter();
  const { q } = router.query;

  const searchQuery =
    typeof q === "string" ? q : "";

  const handleClearSearch = () => {
    router.push("/search");
  };

  return (
    <main className="flex-1 p-4 text-foreground">
      <div className="max-w-6xl">

        {searchQuery && (
          <div className="mb-6 flex items-center justify-between gap-4">

            <div>
              <h1 className="text-xl font-medium">
                Search results for "{searchQuery}"
              </h1>
            </div>

            <Button
              variant="outline"
              onClick={handleClearSearch}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear Search
            </Button>

          </div>
        )}

        <Suspense
          fallback={
            <div className="text-muted-foreground">
              Loading search results...
            </div>
          }
        >
          <SearchResult query={searchQuery} />
        </Suspense>

      </div>
    </main>
  );
};

export default index;