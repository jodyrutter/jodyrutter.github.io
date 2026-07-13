const experience = [
  {
    period: "Nov 2022 - Present",
    role: "Software Engineer II",
    company: "JPMorgan Chase & Co.",
    summary:
      "Develop, test, and maintain C-based payment-processing applications on Stratus OpenVOS. Support production releases and issue investigation with SQL and Splunk, implement PCI 4.0 data-protection updates, and contribute to Java/Spring Boot functional-test automation for interconnected payment engines.",
    skills: ["C", "Java", "Spring Boot", "SQL", "Splunk", "OpenVOS"],
    highlight: "Enterprise payments engineering with production validation, on-call support, and PCI data protection.",
    image: "assets/images/experience/jpmc-payments.svg"
  },
  {
    period: "Aug 2021 - Nov 2022",
    role: "Consultant Software Engineer",
    company: "Wiley Edge",
    summary:
      "Completed an intensive C, Linux, and banking-technology training program before joining JPMorgan Chase as a consultant engineer. Contributed to development, testing, and production support for Stratus OpenVOS applications, then converted to a permanent Software Engineer II role.",
    skills: ["C", "Linux", "Banking Technology", "OpenVOS", "Production Support"],
    highlight: "Consulting-to-permanent path in a high-accountability financial technology environment.",
    image: "assets/images/experience/wiley-edge.svg"
  },
  {
    period: "Mar 2021 - Aug 2021",
    role: "Freelance Software Engineer",
    company: "Self-Employed",
    summary:
      "Delivered client applications from design outline to working product, including a telehealth portal built with React and Tailwind CSS and an SMS-based quiz application using React and JavaScript server-side logic.",
    skills: ["React", "JavaScript", "Tailwind CSS", "Client Delivery"],
    highlight: "Direct client communication and focused end-to-end delivery on short timelines.",
    image: "assets/images/experience/freelance-studio.svg"
  },
  {
    period: "Jan 2020 - Mar 2021",
    role: "Software Engineer",
    company: "Tenex Software Solutions",
    summary:
      "Delivered feature work and bug fixes for election and polling software across front-end, back-end, and database layers. Maintained ASP.NET applications with a Visual Basic backend, JavaScript/HTML/CSS front end, MySQL data layer, and AWS-supported deployment environment.",
    skills: ["ASP.NET", "Visual Basic", "JavaScript", "MySQL", "AWS"],
    highlight: "Full-stack product work for operational software with real-world reliability requirements.",
    image: "assets/images/experience/tenex-pollbook.svg"
  },
  {
    period: "Oct 2019 - Dec 2019",
    role: "Software Intern",
    company: "Ideas Worth Coding",
    summary:
      "Contributed to mobile and web application features for a Tampa startup, using React Native, React, JavaScript, Firebase, APIs, and GitHub while collaborating in a small product-development team.",
    skills: ["React Native", "React", "Firebase", "APIs"],
    highlight: "Early product engineering experience in a collaborative startup environment.",
    image: "assets/images/experience/ideas-worth-coding.svg"
  },
  {
    period: "Mar 2019 - Dec 2019",
    role: "Undergraduate Researcher",
    company: "CARRT Lab, University of South Florida",
    summary:
      "Contributed to software and research work around brain-computer-interface wheelchair simulation, using Unity, C#, C++, Arduino scripting, and Bluetooth-based hardware communication in an interdisciplinary accessibility project.",
    skills: ["Unity", "C#", "C++", "Arduino", "Bluetooth"],
    highlight: "Applied software research spanning simulation, hardware integration, and assistive technology.",
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
  },
  {
    title: "Freedom Flight",
    subtitle: "Personal HTML5 game project",
    repo: "Freedom-Flight",
    description:
      "A Construct-built browser game preserved as a live HTML5 deployment, showing an earlier project carried through to a playable web experience.",
    stack: ["Construct", "HTML5", "Game Design", "Browser Play"],
    url: "https://github.com/jodyrutter/Freedom-Flight",
    liveUrl: "games/freedom-flight/index.html",
    liveLabel: "Play project",
    image: "assets/images/projects/freedom-flight.svg"
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
          <div class="timeline-main">
            <figure class="timeline-visual">
              <img src="${item.image}" alt="${item.company} poster." />
            </figure>
            <div class="timeline-body">
              <div class="timeline-heading">
                <h3>${item.role}</h3>
                <strong>${item.company}</strong>
              </div>
              <p>${item.summary}</p>
              <div class="timeline-meta">
                ${item.skills.map((skill) => `<span>${skill}</span>`).join("")}
              </div>
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
            ${project.liveUrl ? `<a href="${project.liveUrl}">${project.liveLabel || "View live"}</a>` : ""}
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
