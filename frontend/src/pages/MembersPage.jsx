// import React from 'react';
// // import './MembersPage.css';

// // Data for team members and their responsibilities
// const members = [
//   {
//     name: 'Nishan',
//     responsibilities: [
//       'Backend Development',
//       'DevOps & Deployment',
//     ],
//   },
//   {
//     name: 'Aditya',
//     responsibilities: [
//       'Requirement Analysis',
//       'Research',
//       'UI/UX Design',
//       'Frontend Development',
//       'Business Logic Implementation',
//       'Performance Optimization',
//     ],
//   },
//   {
//     name: 'Suraj',
//     responsibilities: [
//       'Quality Assurance & Testing',
//       'Functional Testing',
//       'UI Testing',
//       'Validation Testing',
//       'Smoke Testing',
//       'Regression Testing',
//       'Retesting',
//       'End-to-End (E2E) Testing',
//       'Compatibility Testing',
//       'Responsive Testing',
//       'Bug Reporting',
//     ],
//   },
//   {
//     name: 'Tushar',
//     responsibilities: [
//       'Requirement Analysis',
//       'System Design',
//       'Documentation',
//       'Monitoring & Logging',
//     ],
//   },
//   {
//     name: 'Adarsh',
//     responsibilities: [
//       'Project Coordination',
//       'Product Management',
//       'Content Management',
//       'User Acceptance Testing (UAT)',
//       'Presentation & Demonstration Support',
//     ],
//   },
// ];


// export default function MembersPage() {
//   return (
//     <section className="members-section terms-page">
//       <h1 className="members-title" style={{ fontFamily: 'Inter, sans-serif' }}>
//         Team Members &amp; Responsibilities
//       </h1>
//       <div className="members-grid">
//         {members.map((member) => (
//           <article
//             key={member.name}
//             className="member-card"
//           >
//             <h2 className="member-name" style={{ fontFamily: 'Inter, sans-serif' }}>
//               {member.name}
//             </h2>
//             <ul className="member-responsibilities">
//               {member.responsibilities.map((task, idx) => (
//                 <li key={idx}>{task}</li>
//               ))}
//             </ul>
//           </article>
//         ))}
//       </div>
//     </section>
//   );
// }


import React from "react";

const members = [
  {
    name: "Nishan",
    role: "Backend Developer • DevOps Engineer",
    summary:
      "Designed, developed, deployed, and maintained the complete backend infrastructure.",
    responsibilities: [
      {
        title: "Backend Development",
        items: [
          "Designed backend architecture.",
          "Developed REST APIs.",
          "Implemented business logic.",
          "Handled request validation and error handling.",
          "Documented and sumitted Backend APIs"
        ],
      },
      {
        title: "Database",
        items: [
          "Designed database schema.",
          "Established database connections.",
          "Implemented CRUD operations.",
          "Managed data integrity and relationships.",
        ],
      },
      {
        title: "Authentication & Security",
        items: [
          "Implemented authentication and authorization.",
          "Implemented Oauth",
          "Configured JWT/token handling.",
          "Protected backend endpoints.",
        ],
      },
      {
        title: "Deployment & DevOps",
        items: [
          "Containerized backend services using Docker.",
          "Managed deployments.",
          "Generated production builds.",
          "Verified successful deployments.",
          "Managed application configuration.",
          "Handled environment variables.",
        ],
      },
    ],
  },

  {
    name: "Aditya",
    role: "Frontend Developer • UI/UX Designer",
    summary:
      "Designed the user experience and implemented the client-side application.",
    responsibilities: [
      {
        title: "Requirement Analysis",
        items: [
          "Collected functional requirements.",
          "Prepared UI flow and navigation.",
        ],
      },
      {
        title: "UI/UX Design",
        items: [
          "Designed layouts and interfaces.",
          "Created responsive user experience.",
          "Maintained design consistency.",
        ],
      },
      {
        title: "Frontend Development",
        items: [
          "Developed reusable React components.",
          "Integrated frontend with backend APIs.",
          "Integrated frontend with backend APIs.",
          "Implemented frontend logic",

          "Implemented forms and client-side validation.",
        ],
      },
      {
        title: "Optimization",
        items: [
          "Improved rendering performance.",
          "Enhanced responsiveness.",
          "Optimized user interactions.",
        ],
      },
    ],
  },

  {
    name: "Suraj",
    role: "QA Engineer",
    summary:
      "Verified application quality through functional and non-functional testing.",
    responsibilities: [
      {
        title: "Testing",
        items: [
          "Functional Testing",
          "Smoke Testing",
          "Regression Testing",
          "Retesting",
          "Validation Testing",
          "UI Testing",
          "End-to-End Testing",
          "Cross-browser Testing",
          "Responsive Testing",
        ],
      },
      {
        title: "Quality Assurance",
        items: [
          "Reported bugs.",
          "Verified bug fixes.",
          "Maintained testing documentation.",
          "Ensured application stability before release.",
        ],
      },
    ],
  },

  {
    name: "Tushar",
    role: "System Analyst • Documentation",
    summary:
      "Prepared documentation, system design, and monitored project progress.",
    responsibilities: [
      {
        title: "Requirement Analysis",
        items: [
          "Gathered functional requirements.",
          "Prepared project planning.",
        ],
      },
      {
        title: "System Design",
        items: [
          "Prepared architecture diagrams.",
          "Documented module interactions.",
          "Reviewed workflow.",
        ],
      },
      {
        title: "Documentation",
        items: [
          "Prepared project documentation.",
          "Maintained technical reports.",
          "Updated project records.",
        ],
      },
      {
        title: "Monitoring",
        items: [
          "Tracked project progress.",
          "Reviewed implementation consistency.",
        ],
      },
    ],
  },

  {
    name: "Adarsh",
    role: "Project Coordinator • Product Manager",
    summary:
      "Managed project coordination, content, and presentation activities.",
    responsibilities: [
      {
        title: "Project Coordination",
        items: [
          "Managed communication among team members.",
          "Tracked project milestones.",
          "Coordinated task assignments.",
        ],
      },
      {
        title: "Product Management",
        items: [
          "Reviewed project objectives.",
          "Managed feature planning.",
          "Collected user feedback.",
        ],
      },
      {
        title: "Content & Presentation",
        items: [
          "Managed project content.",
          "Prepared presentation materials.",
          "Supported final demonstrations.",
          "Conducted User Acceptance Testing (UAT).",
        ],
      },
    ],
  },
];

export default function MembersPage() {
  return (
    <section className="members-section terms-page">
      <h1
        className="members-title"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        Team Members & Responsibilities
      </h1>

      <div className="members-grid">
        {members.map((member) => (
          <article key={member.name} className="member-card">
            <h2
              className="member-name"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {member.name}
            </h2>

            <p
              style={{
                color: "#666",
                marginBottom: "0.75rem",
                fontWeight: 600,
              }}
            >
              {member.role}
            </p>

            <p style={{ marginBottom: "1rem" }}>{member.summary}</p>

            {member.responsibilities.map((section) => (
              <details
                key={section.title}
                style={{
                  marginBottom: "0.75rem",
                  border: "1px solid #eee",
                  borderRadius: "8px",
                  padding: "0.75rem",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {section.title}
                </summary>

                <ul
                  style={{
                    marginTop: "0.75rem",
                    paddingLeft: "1.25rem",
                  }}
                >
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}