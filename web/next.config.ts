 import type { NextConfig } from "next";

 const nextConfig: NextConfig = {
   turbopack: {
     // Next.js가 workspace 루트를 잘못 추론하지 않도록 web 디렉터리를 루트로 지정
     root: __dirname,
   },
 };

 export default nextConfig;
