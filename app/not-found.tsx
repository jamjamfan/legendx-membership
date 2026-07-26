import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        color: "white",
        textAlign: "center",
        background: "var(--navy-950)",
      }}
    >
      <div>
        <p className="eyebrow" style={{ justifyContent: "center" }}>
          404 · Route not found
        </p>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3rem, 10vw, 7rem)",
            fontWeight: 500,
          }}
        >
          這一步未在路線上。
        </h1>
        <p style={{ color: "rgba(255,255,255,.58)" }}>
          返回首頁，再選擇你的方向。
        </p>
        <Link className="button button-primary" href="/">
          返回首頁
        </Link>
      </div>
    </main>
  );
}
