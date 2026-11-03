/** Illustrative faces on a fixed office plate; no widget/session dependencies. */
export function WorkerFace({x,y,scale=1,angle=0,name}:{x:number;y:number;scale?:number;angle?:number;name:string}){
  return <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
    <g className={`office-face face-${name}`}>
      <g className="face-gaze">
        <g className="face-eyes">
          <path d="M-23 0 C-23-13-9-13-9 0"/>
          <path d="M9 0 C9-13 23-13 23 0"/>
        </g>
        <path className="face-smile" d="M-7 9 Q0 16 7 9"/>
      </g>
    </g>
  </g>;
}
export function LayeredOffice(){
  return <div className="layered-office" aria-hidden="true">
    <svg className="office-composite" viewBox="0 0 941 1672" preserveAspectRatio="xMidYMid meet" focusable="false">
      <defs>
        <filter id="office-face-glow" x="-60%" y="-80%" width="220%" height="260%"><feGaussianBlur stdDeviation="1.6" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <clipPath id="left-face-screen"><path d="M127 841 Q131 810 155 804 Q182 797 195 820 L203 841 Q184 857 127 841"/></clipPath>
        <clipPath id="right-face-screen"><path d="M772 854 Q778 823 802 822 Q827 820 835 853 Q818 872 772 854"/></clipPath>
        <clipPath id="back-face-screen"><path d="M837 667 Q840 651 851 651 Q864 650 867 668 Z"/></clipPath>
      </defs>
      <image href="/backgrounds/office-faces-ready-v3.png" width="941" height="1672"/>
      <g clipPath="url(#left-face-screen)"><WorkerFace x={164} y={831} scale={.92} angle={-6} name="analysis"/></g>
      <g clipPath="url(#right-face-screen)"><WorkerFace x={804} y={847} scale={.82} angle={8} name="documents"/></g>
      <g clipPath="url(#back-face-screen)"><WorkerFace x={852} y={662} scale={.36} name="validation"/></g>
    </svg>
  </div>;
}
