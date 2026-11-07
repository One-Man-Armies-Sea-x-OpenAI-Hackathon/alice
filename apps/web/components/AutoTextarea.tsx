"use client";
import {
  forwardRef,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

export default forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function AutoTextarea({ className = "", onInput, ...props }, forwarded) {
  const local = useRef<HTMLTextAreaElement | null>(null);
  function resize() {
    const el = local.current;
    if (!el) return;
    const style = getComputedStyle(el);
    const max = parseFloat(style.maxHeight) || 240;
    const border =
      parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    el.style.height = "auto";
    const height = el.scrollHeight + border;
    el.style.height = Math.min(max, height) + "px";
    el.style.overflowY = height > max ? "auto" : "hidden";
  }
  useLayoutEffect(resize, [props.value, props.defaultValue]);
  useLayoutEffect(() => {
    const el = local.current;
    if (!el) return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth;
        resize();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <textarea
      {...props}
      className={`auto-textarea ${className}`}
      ref={(el) => {
        local.current = el;
        if (typeof forwarded === "function") forwarded(el);
        else if (forwarded) forwarded.current = el;
      }}
      onInput={(event) => {
        resize();
        onInput?.(event);
      }}
    />
  );
});
