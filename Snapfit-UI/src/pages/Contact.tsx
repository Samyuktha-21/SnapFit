import { Github, Linkedin, Mail } from 'lucide-react';

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
                  <Linkedin className="h-5 w-5" />
                  <span className="text-sm font-medium">LinkedIn</span>
                </a>
                <a 
                  href="https://github.com/Samyuktha-21" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <Github className="h-5 w-5" />
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
                  <Linkedin className="h-5 w-5" />
                  <span className="text-sm font-medium">LinkedIn</span>
                </a>
                <a 
                  href="https://github.com/NINJA-1029" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <Github className="h-5 w-5" />
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
