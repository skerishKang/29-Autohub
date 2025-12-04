 import type { NextConfig } from "next";

 const nextConfig: NextConfig = {
   // 정적 사이트로 export 해서 Netlify에서 단순 정적 호스팅을 사용
   output: "export",
   turbopack: {
     // Next.js가 workspace 루트를 잘못 추론하지 않도록 web 디렉터리를 루트로 지정
     root: __dirname,
   },
 };

 export default nextConfig;
