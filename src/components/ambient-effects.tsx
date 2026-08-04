"use client";
import { useEffect, useState } from "react";
import { ForgeMark } from "./icons";
export function AmbientEffects(){
  const[ready,setReady]=useState(false);
  useEffect(()=>{
    let frame=0;let targetX=0;let targetY=0;let currentX=0;let currentY=0;
    const root=document.documentElement;
    const body=document.body;
    const render=()=>{currentX+=(targetX-currentX)*.075;currentY+=(targetY-currentY)*.075;root.style.setProperty("--hero-x",`${currentX.toFixed(2)}px`);root.style.setProperty("--hero-y",`${currentY.toFixed(2)}px`);frame=requestAnimationFrame(render)};
    const move=(event:PointerEvent)=>{root.style.setProperty("--pointer-x",`${event.clientX}px`);root.style.setProperty("--pointer-y",`${event.clientY}px`);targetX=((event.clientX/window.innerWidth)-.5)*18;targetY=((event.clientY/window.innerHeight)-.5)*12};
    const scroll=()=>{const limit=root.scrollHeight-window.innerHeight;root.style.setProperty("--scroll-progress",`${limit>0?(window.scrollY/limit)*100:0}%`);body.classList.toggle("is-scrolled",window.scrollY>44)};
    const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");reveal.unobserve(entry.target)}}),{rootMargin:"0px 0px -10%",threshold:.12});
    document.querySelectorAll("[data-reveal]").forEach(element=>reveal.observe(element));
    window.addEventListener("pointermove",move,{passive:true});window.addEventListener("scroll",scroll,{passive:true});scroll();frame=requestAnimationFrame(render);
    const readyFrame=requestAnimationFrame(()=>{body.classList.add("is-ready");setReady(true)});
    return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(readyFrame);reveal.disconnect();window.removeEventListener("pointermove",move);window.removeEventListener("scroll",scroll);body.classList.remove("is-scrolled","is-ready")};
  },[]);
  return <><div className={`page-loader ${ready?"loaded":""}`} aria-hidden><div className="loader-brand"><ForgeMark/><span>FUT FORGE</span></div><i/></div><div className="cursor-ambient"/><div className="scroll-progress"/></>;
}
