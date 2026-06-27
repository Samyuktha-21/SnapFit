import React from 'react';

export default function Contact() {
  return (
    <div className="min-h-[85vh] py-12 relative flex items-center justify-center">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Meet the Team
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            We are engineering students passionate about solving everyday problems using computer vision, machine learning, and modern web tech. 
            SnapFit is our vision for a perfectly fitting future.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 pt-8">
          {/* SAMYUKTHA S */}
          <div className="group rounded-[2rem] bg-gradient-to-br from-neutral-900/90 to-black/90 border border-white/10 p-8 relative overflow-hidden backdrop-blur-xl shadow-xl hover:border-accent/40 transition-all duration-300">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-accent/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">SAMYUKTHA S</h3>
                <p className="text-accent font-medium mt-1">Co-Founder & Developer</p>
              </div>
              
              <p className="text-neutral-400 text-sm leading-relaxed">
                Focused on architecting scalable systems and delivering seamless user experiences. Driving the technical vision of SnapFit.
              </p>
              
              <div className="flex gap-4 pt-4 border-t border-neutral-800">
                <a 
                  href="https://www.linkedin.com/in/samyuktha-subramanian21/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  <span className="text-sm font-medium">LinkedIn</span>
                </a>
                <a 
                  href="https://github.com/Samyuktha-21" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  <span className="text-sm font-medium">GitHub</span>
                </a>
              </div>
            </div>
          </div>

          {/* SUDHARSAN M */}
          <div className="group rounded-[2rem] bg-gradient-to-br from-neutral-900/90 to-black/90 border border-white/10 p-8 relative overflow-hidden backdrop-blur-xl shadow-xl hover:border-accent/40 transition-all duration-300">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-accent/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">SUDHARSAN M</h3>
                <p className="text-accent font-medium mt-1">Co-Founder & Developer</p>
              </div>
              
              <p className="text-neutral-400 text-sm leading-relaxed">
                Specializing in computer vision algorithms, AI integration, and bringing innovative measurement tech to the web platform.
              </p>
              
              <div className="flex gap-4 pt-4 border-t border-neutral-800">
                <a 
                  href="https://www.linkedin.com/in/sudharsan-m-ninz/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  <span className="text-sm font-medium">LinkedIn</span>
                </a>
                <a 
                  href="https://github.com/NINJA-1029" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  <span className="text-sm font-medium">GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-neutral-500 text-sm">
            Interested in what we're building? Connect with us on LinkedIn!
          </p>
        </div>
      </div>
    </div>
  );
}
