const experience = [
  {
    period: "Nov 2022 - Present",
    role: "Software Engineer II",
    company: "JPMorgan Chase & Co.",
    summary:
      "Support payment-processing software in a legacy environment, working with C and Stratus OpenVOS while contributing to releases, production validation, and operational troubleshooting.",
    skills: ["C", "Stratus OpenVOS", "SQL", "Splunk", "Release Support"],
    highlight: "Production-facing software in a reliability-first payments environment.",
    image: "assets/images/experience/jpmc-payments.svg"
  },
  {
    period: "Aug 2021 - Nov 2022",
    role: "Consultant Software Engineer",
    company: "Wiley Edge",
    summary:
      "Provided development support for JPMorgan Chase while ramping quickly on a legacy stack and production workflows that required careful validation and reliability-minded changes.",
    skills: ["Consulting", "Legacy Systems", "Production Support", "Validation"],
    highlight: "Fast ramp-up work with high expectations around stability and support.",
    image: "assets/images/experience/wiley-edge.svg"
  },
  {
    period: "Mar 2021 - Aug 2021",
    role: "Freelance Software Engineer",
    company: "Self-Employed",
    summary:
      "Built full-stack software for clients and translated product ideas into working applications, using tools such as React, React Native, and Django.",
    skills: ["React", "React Native", "Django", "Full-Stack"],
    highlight: "Independent builds where communication and shipping mattered as much as code.",
    image: "assets/images/experience/freelance-studio.svg"
  },
  {
    period: "Jan 2020 - Mar 2021",
    role: "Software Engineer",
    company: "Tenex Software Solutions",
    summary:
      "Debugged and improved software for an online poll book product, working in ASP.NET with a Visual Basic backend and JavaScript, HTML, CSS, MySQL, and AWS.",
    skills: ["ASP.NET", "Visual Basic", "JavaScript", "MySQL", "AWS"],
    highlight: "Product work with real operational stakes and a broad day-to-day stack.",
    image: "assets/images/experience/tenex-pollbook.svg"
  },
  {
    period: "Oct 2019 - Dec 2019",
    role: "Software Intern",
    company: "Ideas Worth Coding",
    summary:
      "Designed and built Swolemate, a React Native app for matching gym partners, with Firebase used as the backing data platform.",
    skills: ["React Native", "Firebase", "Mobile App Design"],
    highlight: "A mobile-first build centered on matching, UX, and quick product iteration.",
    image: "assets/images/experience/ideas-worth-coding.svg"
  },
  {
    period: "Mar 2019 - Dec 2019",
    role: "Undergraduate Researcher",
    company: "CARRT Lab, University of South Florida",
    summary:
      "Worked on a brain-computer-interface wheelchair project using Unity and C# for simulation, plus Arduino and Bluetooth integration for physical control experiments.",
    skills: ["Unity", "C#", "Arduino", "C++", "Research Prototyping"],
    highlight: "Research that blended simulation, hardware control, and accessibility thinking.",
    image: "assets/images/experience/carrt-lab.svg"
  }
];

const featuredProjects = [
  {
    title: "Hearthboard",
    subtitle: "Self-hosted household calendar and schedule board",
    repo: "At-Home-Calendar",
    description:
      "A recent JavaScript project built for practical home use, combining an Express backend, LowDB persistence, and a polished front-end experience designed for local-network deployment.",
    stack: ["JavaScript", "Node.js", "Express", "LowDB", "Docker"],
    url: "https://github.com/jodyrutter/At-Home-Calendar",
    image: "assets/images/projects/hearthboard.svg"
  },
  {
    title: "BCI Wheelchair Simulator",
    subtitle: "Applied research for assistive mobility training",
    repo: "BCI-Wheelchair-Simulator",
    description:
      "A Unity and C# simulator exploring how users could train with a brain-computer-interface wheelchair workflow before moving to physical hardware.",
    stack: ["C#", "Unity", "Accessibility", "Simulation"],
    url: "https://github.com/jodyrutter/BCI-Wheelchair-Simulator",
    image: "assets/images/projects/bci-wheelchair.svg"
  },
  {
    title: "Ensemble",
    subtitle: "Matching local musicians with collaborators",
    repo: "Ensemble",
    description:
      "A product-minded app concept focused on pairing musicians in the same locale, showing an interest in social discovery, user needs, and software with a community angle.",
    stack: ["C#", "Product Design", "Matching"],
    url: "https://github.com/jodyrutter/Ensemble",
    image: "assets/images/projects/ensemble.svg"
  },
  {
    title: "C Linux Game",
    subtitle: "Lower-level programming and systems practice",
    repo: "C_Linux_Game",
    description:
      "A class project rooted in C and Linux fundamentals, highlighting comfort with lower-level problem solving and programming closer to the system.",
    stack: ["C", "Linux", "Systems Thinking"],
    url: "https://github.com/jodyrutter/C_Linux_Game",
    image: "assets/images/projects/c-linux-game.svg"
  }
];

const githubArchive = [
  {
    name: "Shaiya Bot by Jody Rutter",
    language: "AutoHotkey",
    description: "Automation scripting for movement-heavy repetitive tasks in a game environment.",
    url: "https://github.com/jodyrutter/Shaiya-Bot-by-Jody-Rutter"
  },
  {
    name: "Chemical Reaction Sim",
    language: "Team Project",
    description: "A collaborative 2016 simulator project built with a larger student team.",
    url: "https://github.com/jodyrutter/Chemical-reaction-sim"
  },
  {
    name: "Individual Assignment 2",
    language: "Java",
    description: "Android coursework centered on sending, receiving, and intercepting app messages.",
    url: "https://github.com/jodyrutter/individual-assignment-2"
  },
  {
    name: "Montissa",
    language: "C++",
    description: "A utility for showing the mantissa of a 32-bit floating-point value for class work.",
    url: "https://github.com/jodyrutter/Montissa"
  }
];

const experienceRoot = document.querySelector("#experience-list");
const featuredRoot = document.querySelector("#featured-projects");
const archiveRoot = document.querySelector("#github-archive");
const yearRoot = document.querySelector("#current-year");

if (experienceRoot) {
  experienceRoot.innerHTML = experience
    .map(
      (item) => `
        <article class="timeline-item reveal">
          <div class="timeline-date-block">
            <div class="timeline-date">${item.period}</div>
            <p class="timeline-highlight">${item.highlight}</p>
          </div>
          <figure class="timeline-visual">
            <img src="${item.image}" alt="${item.company} poster." />
          </figure>
          <div class="timeline-body">
            <div>
              <h3>${item.role}</h3>
              <strong>${item.company}</strong>
            </div>
            <p>${item.summary}</p>
            <div class="timeline-meta">
              ${item.skills.map((skill) => `<span>${skill}</span>`).join("")}
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

if (featuredRoot) {
  featuredRoot.innerHTML = featuredProjects
    .map(
      (project) => `
        <article class="project-card reveal">
          <figure class="project-poster">
            <img src="${project.image}" alt="${project.title} poster." />
          </figure>
          <div class="project-topline">
            <div>
              <p class="eyebrow">${project.repo}</p>
              <h3>${project.title}</h3>
            </div>
            <div class="project-meta">
              ${project.stack.slice(0, 2).map((tag) => `<span>${tag}</span>`).join("")}
            </div>
          </div>
          <p><strong>${project.subtitle}</strong></p>
          <p>${project.description}</p>
          <div class="stack-tags">
            ${project.stack.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
          <div class="project-links">
            <a href="${project.url}" target="_blank" rel="noreferrer">Open repository</a>
          </div>
        </article>
      `
    )
    .join("");
}

if (archiveRoot) {
  archiveRoot.innerHTML = githubArchive
    .map(
      (repo) => `
        <article class="archive-item">
          <div class="project-meta">
            <span class="archive-pill">${repo.language}</span>
          </div>
          <h4>${repo.name}</h4>
          <p>${repo.description}</p>
          <a href="${repo.url}" target="_blank" rel="noreferrer">View on GitHub</a>
        </article>
      `
    )
    .join("");
}

if (yearRoot) {
  yearRoot.textContent = new Date().getFullYear();
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.2
  }
);

document.querySelectorAll(".reveal").forEach((node) => {
  observer.observe(node);
});
