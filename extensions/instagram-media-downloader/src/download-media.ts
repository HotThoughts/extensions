import axios from "axios";
import { createWriteStream, existsSync } from "fs";
import { showToast, Toast, open } from "@raycast/api";

export async function getInstagramMediaURL(instagramUrl: string) {
  try {
    const response = await axios.post(
      "https://instagram-media.zeabur.app/get-instagram-media",
      {
        url: instagramUrl,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        },
      },
    );

    const mediaUrls = response.data["urls"];

    return mediaUrls;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error:", error.message);
    } else {
      console.error("Error:", (error as Error).message);
    }
    return null;
  }
}

export async function handleDownload(mediaUrl: string, mediaId: string, downloadFolder: string, fileExtension: string) {
  let filePath = `${downloadFolder}/${mediaId.substring(0, 100)}.${fileExtension}`;
  let counter = 1;

  while (existsSync(filePath)) {
    filePath = `${downloadFolder}/${mediaId.substring(0, 100)}(${counter}).${fileExtension}`;
    counter++;
  }

  const writer = createWriteStream(filePath);

  const progressToast = await showToast({
    title: "Downloading Media",
    message: "0%",
    style: Toast.Style.Animated,
  });

  try {
    const response = await axios.get(mediaUrl, {
      responseType: "stream",
      onDownloadProgress: (event) => {
        if (event.total) {
          const progress = Math.round((event.loaded / event.total) * 100);
          progressToast.message = `${progress}%`;
        }
      },
    });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    await showToast({
      title: "Download Complete",
      message: `Media saved to ${filePath}`,
      style: Toast.Style.Success,
      primaryAction: {
        title: "Open in Finder",
        onAction: () => {
          open(filePath);
        },
      },
    });
  } catch (error) {
    await showToast({
      title: "Error While Downloading Media",
      message: error instanceof Error ? error.message : "Unknown error occurred",
      style: Toast.Style.Failure,
    });
  }
}
