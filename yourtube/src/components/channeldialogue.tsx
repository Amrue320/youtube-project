import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { Button } from "./ui/button";

const CreateChannelButton = () => {
  const router = useRouter();
  const { user } = useUser();

  const handleCreateChannel = () => {
    console.log("========== USER DATA ==========");
    console.log(user);
    console.log("User _id:", user?._id);
    console.log("User id:", user?.id);

    if (!user) {
      alert("User not logged in");
      return;
    }

    if (!user?._id) {
      alert("User ID is missing");
      console.log("User object:", user);
      return;
    }

    router.push(`/channel/${user._id}`);
  };

  return (
    <Button onClick={handleCreateChannel}>
      Create Channel
    </Button>
  );
};

export default CreateChannelButton;