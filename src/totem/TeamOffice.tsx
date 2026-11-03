import { WorkerFace } from './LayeredOffice';

/** Alternate office study. Only visible screens receive illustrative faces. */
export function TeamOffice(){
  return <div className="layered-office" aria-hidden="true">
    <svg className="office-composite team-composite" viewBox="0 0 572 1024" preserveAspectRatio="xMidYMid meet" focusable="false">
      <defs>
        <filter id="office-face-glow" x="-60%" y="-80%" width="220%" height="260%"><feGaussianBlur stdDeviation=".7" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <clipPath id="team-left"><path d="M99 540 Q100 523 112 520 Q127 519 131 541 Q119 550 99 540"/></clipPath>
        <clipPath id="team-reader"><path d="M352 562 Q350 546 362 543 Q374 539 378 559 Q366 568 352 562"/></clipPath>
        <clipPath id="team-center"><path d="M411 541 Q413 525 425 524 Q440 524 445 542 Q428 553 411 541"/></clipPath>
        <clipPath id="team-right"><path d="M477 550 Q476 536 486 533 Q499 532 504 551 Z"/></clipPath>
      </defs>
      <image href="/backgrounds/office-team-no-back-v2.png" width="572" height="1024"/>
      <g clipPath="url(#team-left)"><WorkerFace x={115} y={533} scale={.35} angle={8} name="analysis"/></g>
      <g clipPath="url(#team-reader)"><WorkerFace x={365} y={554} scale={.29} angle={-10} name="documents"/></g>
      <g clipPath="url(#team-center)"><WorkerFace x={426} y={535} scale={.36} angle={10} name="validation"/></g>
      <g clipPath="url(#team-right)" className="team-fourth"><WorkerFace x={488} y={543} scale={.29} angle={8} name="analysis"/></g>
    </svg>
  </div>;
}
