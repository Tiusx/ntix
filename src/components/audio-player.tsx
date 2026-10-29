"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Memos 音频附件播放器。
 *
 * 单独拆成 client 岛：memos 正文已改为构建期渲染，播放器是卡片里唯一
 * 需要浏览器状态的部分，放在服务端组件里会把它整棵树拖回客户端。
 */
export function AudioPlayer({ src, filename }: { src: string; filename: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");

  const formatTime = (sec: number) => {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
      setCurrentTime(formatTime(audio.currentTime));
    };
    const onLoadedMetadata = () => {
      setDuration(formatTime(audio.duration));
    };
    const onEnded = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="mt-3 memo-audio-player">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "暂停" : "播放"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent/80"
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{filename}</p>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
            <span className="shrink-0 tabular-nums">{currentTime}</span>
            <div
              className="relative h-1 flex-1 cursor-pointer overflow-hidden rounded-full bg-line"
              onClick={(e) => {
                const audio = audioRef.current;
                if (!audio || !audio.duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                audio.currentTime = ratio * audio.duration;
              }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="shrink-0 tabular-nums">{duration}</span>
          </div>
        </div>
        <a
          href={src}
          download={filename}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-white"
          title="下载"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </a>
      </div>
      <audio ref={audioRef} preload="metadata" className="hidden">
        <source src={src} />
      </audio>
    </div>
  );
}
