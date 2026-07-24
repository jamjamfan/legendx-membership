export function ProgressionOrbit() {
  return (
    <div className="progress-orbit" aria-label="LegendX 三階段進階路線">
      <div className="orbit-ring" aria-hidden />
      <div className="orbit-stage orbit-stage-one">
        <span>STAGE 01</span>
        <strong>財技覺醒</strong>
        <small>建立時間自由藍圖</small>
      </div>
      <div className="orbit-stage orbit-stage-two">
        <span>STAGE 02</span>
        <strong>實踐成果</strong>
        <small>練習、回饋、修正</small>
      </div>
      <div className="orbit-stage orbit-stage-three">
        <span>STAGE 03</span>
        <strong>傳承價值</strong>
        <small>由個人成就到影響別人</small>
      </div>
      <div className="orbit-core">
        <div>
          <span>X</span>
          <small>YOUR PATH</small>
        </div>
      </div>
    </div>
  );
}
