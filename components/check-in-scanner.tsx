"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CircleCheck, Keyboard, ScanLine } from "lucide-react";

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options: { formats: string[] }): BarcodeDetectorLike;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

export function CheckInScanner({
  lessonId,
  lessonTitle,
}: {
  lessonId: string;
  lessonTitle: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const [manualToken, setManualToken] = useState("");
  const [state, setState] = useState<
    "idle" | "starting" | "scanning" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("準備好後開啟相機。");

  const checkIn = useCallback(
    async (token: string) => {
      if (busyRef.current || !token) return;
      busyRef.current = true;
      try {
        const response = await fetch("/api/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, lessonId }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          const errors: Record<string, string> = {
            already_checked_in: "呢位學員已經簽到。",
            invalid_or_expired_pass: "通行證已失效，請學員重新開啟。",
            active_enrollment_required: "搵唔到有效報名記錄。",
            lesson_session_mismatch: "通行證唔屬於呢個場次。",
          };
          throw new Error(errors[payload.error ?? ""] ?? "簽到失敗，請再試。");
        }
        setState("success");
        setMessage("簽到成功；可以繼續掃下一位。");
        setManualToken("");
        window.setTimeout(() => {
          busyRef.current = false;
          setState("scanning");
          setMessage("對準學員通行證 QR。");
        }, 1800);
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "簽到失敗。");
        window.setTimeout(() => {
          busyRef.current = false;
          setState("scanning");
        }, 1800);
      }
    },
    [lessonId],
  );

  const stopCamera = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    frameRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setState("starting");
    setMessage("正在開啟相機…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error("camera_view_missing");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setState("scanning");
      setMessage("對準學員通行證 QR。");

      if (!window.BarcodeDetector) {
        setMessage("呢個瀏覽器未支援自動掃碼；請用下面手動輸入。");
        return;
      }
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const scan = async () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) void checkIn(codes[0].rawValue);
        }
        frameRef.current = requestAnimationFrame(() => void scan());
      };
      frameRef.current = requestAnimationFrame(() => void scan());
    } catch {
      setState("error");
      setMessage("未能使用相機；請允許權限，或者用手動輸入。");
    }
  }, [checkIn]);

  useEffect(() => stopCamera, [stopCamera]);

  return (
    <section className="scanner-layout">
      <div className={`scanner-frame scanner-${state}`}>
        <video muted playsInline ref={videoRef} />
        <span className="scanner-reticle" aria-hidden>
          <ScanLine size={34} />
        </span>
        {state === "success" && (
          <span className="scanner-result">
            <CircleCheck size={30} aria-hidden />
          </span>
        )}
      </div>
      <div className="panel scanner-control">
        <p className="eyebrow">Selected lesson</p>
        <h2>{lessonTitle}</h2>
        <p className={state === "error" ? "scanner-message is-error" : "scanner-message"}>
          {message}
        </p>
        {state === "idle" && (
          <button className="button button-dark" onClick={startCamera} type="button">
            <Camera size={16} aria-hidden />
            開啟相機掃碼
          </button>
        )}
        <form
          className="form-stack scanner-manual"
          onSubmit={(event) => {
            event.preventDefault();
            void checkIn(manualToken.trim());
          }}
        >
          <label>
            <span>
              <Keyboard size={13} aria-hidden /> 手動輸入通行證 token
            </span>
            <textarea
              onChange={(event) => setManualToken(event.target.value)}
              placeholder="貼上 QR 內容"
              value={manualToken}
            />
          </label>
          <button
            className="button button-outline"
            disabled={!manualToken.trim()}
            type="submit"
          >
            手動簽到
          </button>
        </form>
      </div>
    </section>
  );
}
