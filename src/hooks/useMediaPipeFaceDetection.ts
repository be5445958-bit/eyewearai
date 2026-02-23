import { useState, useCallback, useRef } from "react";

const FACE_LANDMARKER_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export interface MediaPipeFaceLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  noseBridge: { x: number; y: number };
  faceRotation: number;
  faceWidth: number;
}

type Status = "idle" | "loading" | "detected" | "no-face" | "error";

let landmarkerPromise: Promise<any> | null = null;

async function getOrCreateLandmarker() {
  if (landmarkerPromise) return landmarkerPromise;

  landmarkerPromise = (async () => {
    const { FaceLandmarker, FilesetResolver } = await import(
      "@mediapipe/tasks-vision"
    );
    const filesetResolver = await FilesetResolver.forVisionTasks(
      FACE_LANDMARKER_WASM_URL
    );
    const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: FACE_LANDMARKER_MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      numFaces: 1,
    });
    return landmarker;
  })();

  return landmarkerPromise;
}

/**
 * Hook to detect facial landmarks from a photo using MediaPipe Face Mesh.
 * Returns normalized coordinates (0-1 range relative to image dimensions).
 */
export function useMediaPipeFaceDetection() {
  const [status, setStatus] = useState<Status>("idle");
  const [landmarks, setLandmarks] = useState<MediaPipeFaceLandmarks | null>(null);
  const abortRef = useRef(0);

  const detect = useCallback(async (photoSrc: string) => {
    const callId = ++abortRef.current;
    setStatus("loading");
    setLandmarks(null);

    try {
      // Load the image into an HTMLImageElement
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = "anonymous";
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = photoSrc;
      });

      if (callId !== abortRef.current) return;

      const landmarker = await getOrCreateLandmarker();
      if (callId !== abortRef.current) return;

      const result = landmarker.detect(img);

      if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        setStatus("no-face");
        return null;
      }

      const face = result.faceLandmarks[0];

      // Key landmark indices (MediaPipe Face Mesh 468 points):
      // #33 = left eye outer corner (right from viewer perspective)
      // #263 = right eye outer corner (left from viewer perspective)  
      // #159 = left eye center (iris area)
      // #386 = right eye center (iris area)
      // #6 = nose bridge top
      // #234 = left face edge (jawline)
      // #454 = right face edge (jawline)

      const leftEyeCenter = face[159]; // left iris area
      const rightEyeCenter = face[386]; // right iris area
      const leftEyeOuter = face[33];
      const rightEyeOuter = face[263];
      const noseBridge = face[6];
      const leftFaceEdge = face[234];
      const rightFaceEdge = face[454];

      // Use iris center landmarks directly — most accurate for pupil position
      const leftEye = {
        x: leftEyeCenter.x,
        y: leftEyeCenter.y,
      };
      const rightEye = {
        x: rightEyeCenter.x,
        y: rightEyeCenter.y,
      };

      // Face rotation from eye angle
      const dx = rightEye.x - leftEye.x;
      const dy = rightEye.y - leftEye.y;
      const faceRotation = (Math.atan2(dy, dx) * 180) / Math.PI;

      // Face width as fraction of image
      const faceWidth = Math.abs(rightFaceEdge.x - leftFaceEdge.x);

      const detected: MediaPipeFaceLandmarks = {
        leftEye,
        rightEye,
        noseBridge: { x: noseBridge.x, y: noseBridge.y },
        faceRotation,
        faceWidth,
      };

      if (callId !== abortRef.current) return;
      setLandmarks(detected);
      setStatus("detected");
      return detected;
    } catch (err) {
      console.error("MediaPipe face detection error:", err);
      if (callId !== abortRef.current) return;
      setStatus("error");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current++;
    setStatus("idle");
    setLandmarks(null);
  }, []);

  return { status, landmarks, detect, reset };
}
