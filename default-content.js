export const DEFAULT_CONTENT = {
  profile: {
    nameKo: "정을균",
    nameEn: "JOUNG EUL KYUN",
    roles: "COACH · RESEARCHER · PUBLIC INNOVATOR",
    degree: "Ph.D. in Coaching",
    credentials: "KSC · ICF PCC",
    headline: "사람의 성장과 조직의 변화를 연구합니다",
    intro: "코칭, 공공행정, AI를 연결해 사람과 조직의 더 나은 변화를 탐구하고 기록합니다.",
    photo: "assets/images/profile.jpg"
  },
  philosophy: {
    eyebrow: "PHILOSOPHY",
    title: "사람을 깊이 이해하고, 변화가 실행되도록 돕습니다.",
    body: "좋은 코칭은 답을 대신 주는 일이 아니라, 스스로 보고 선택하고 실행할 수 있도록 사고의 공간을 넓히는 일이라고 믿습니다. 연구와 공공현장의 경험을 바탕으로 개인의 성장과 조직의 혁신이 만나는 지점을 탐구합니다."
  },
  areas: [
    {id:"area-coaching", sortOrder:1, title:"Coaching",subtitle:"사람의 가능성을 행동으로 연결",body:"리더십, 자기효능감, 질문과 경청, 변화와 실행을 주제로 코칭하고 연구합니다."},
    {id:"area-research", sortOrder:2, title:"Research",subtitle:"현장을 설명하는 근거를 축적",body:"코칭학과 조직행동 연구를 통해 공공조직의 변화와 성장에 관한 실증적 근거를 탐구합니다."},
    {id:"area-public-ai", sortOrder:3, title:"Public × AI",subtitle:"공공업무를 더 정확하고 유연하게",body:"생성형 AI와 바이브코딩을 활용해 현장행정과 업무 프로세스를 개선하는 방법을 실험하고 공유합니다."}
  ],
  research: [
    {id:"research-2026-01", year:"2026",title:"지방공무원의 그릿코칭역량과 동료의 사회적 지지가 혁신행동에 미치는 영향",meta:"코칭학 박사 연구 · 자기효능감의 매개효과",desc:"지방공무원의 혁신행동을 개인의 코칭역량, 사회적 지지, 자기효능감의 관계 속에서 살펴본 연구입니다."}
  ],
  activities: [
    {id:"activity-202609-ai",date:"2026.09",category:"Public × AI",title:"공공업무 AI·바이브코딩 사례 공유",desc:"개별주택가격 업무를 중심으로 생성형 AI를 실제 행정업무 개선에 적용한 경험을 정리하고 공유합니다.",image:"assets/images/activity-placeholder-1.svg"},
    {id:"activity-202609-coaching",date:"2026.09",category:"Coaching",title:"공공기관 리더 코칭",desc:"현장의 리더가 조직과 구성원의 변화를 촉진할 수 있도록 대화와 성찰을 지원합니다.",image:"assets/images/activity-placeholder-2.svg"},
    {id:"activity-202608-lecture",date:"2026.08",category:"Lecture",title:"공공기관 교육·강의 활동 확대",desc:"코칭리더십, 그릿, 조직문화, AI 업무혁신을 주제로 교육 콘텐츠를 개발하고 있습니다.",image:"assets/images/activity-placeholder-3.svg"}
  ],
  articles: [
    {id:"article-20260927",date:"2026.09.27",category:"AI · PUBLIC SERVICE",title:"AI는 공무원의 일을 대신하는가, 확장하는가",summary:"생성형 AI를 실제 행정업무에 적용하면서 느낀 것은 대체보다 확장이었습니다. 사람이 더 중요한 판단에 집중하도록 돕는 도구로서 AI를 바라봅니다.",body:"생성형 AI는 공무원의 업무를 단순히 줄이는 도구가 아니라, 생각하고 확인하고 설명하는 능력을 확장하는 도구가 될 수 있습니다. 반복적인 정리와 정보 구조화는 AI에게 맡기고, 공무원은 현장 판단과 책임 있는 설명에 더 집중할 수 있습니다.\n\n중요한 것은 기술 자체보다 문제를 정확하게 정의하는 능력입니다. 현장의 불편을 발견하고, 작은 시도부터 직접 구현해 보는 경험이 AI 시대의 행정혁신을 현실로 만듭니다.",image:""},
    {id:"article-20260923",date:"2026.09.23",category:"PUBLIC × AI",title:"개별주택가격 업무를 AI로 바꿔본 경험",summary:"종이자료와 복잡한 전산코드를 현장에서 더 빠르게 확인할 수 있도록 업무지원 도구를 직접 만들어 본 과정입니다.",body:"현장조사에서 필요한 정보가 여러 자료와 화면에 흩어져 있으면 확인과 설명에 시간이 걸립니다. 생성형 AI와 바이브코딩을 활용해 필요한 데이터를 한 화면에서 확인할 수 있도록 정리하면서, 현장 대응의 정확성과 업무 효율을 함께 높이는 가능성을 확인했습니다.",image:""},
    {id:"article-20260918",date:"2026.09.18",category:"COACHING",title:"코칭에서 질문보다 먼저 필요한 것",summary:"좋은 질문은 기술만으로 만들어지지 않습니다. 고객을 있는 그대로 이해하려는 태도와 깊은 경청이 먼저입니다.",body:"질문의 수준은 코치가 얼마나 좋은 문장을 알고 있는가보다, 고객의 말과 맥락을 얼마나 깊이 듣고 있는가에 영향을 받습니다. 좋은 코칭은 질문을 준비하는 것에서 시작하기보다, 고객을 이해하려는 호기심과 존재감에서 시작합니다.",image:""}
  ],
  contact: {
    message: "코칭, 연구, 공공혁신과 AI에 관한 대화와 협업을 환영합니다.",
    email: "",
    linkedin: ""
  }
};
