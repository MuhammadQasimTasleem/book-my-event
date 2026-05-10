/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "ui-avatars.com", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
      // Google Images / hosted thumbnails (direct image URLs only)
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "lh4.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "lh5.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "lh6.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "encrypted-tbn0.gstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "encrypted-tbn1.gstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "encrypted-tbn2.gstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "encrypted-tbn3.gstatic.com", pathname: "/**" },
    ],
  },
  async redirects() {
    return [
      { source: "/faq", destination: "/contact", permanent: false },
      { source: "/services", destination: "/organizers", permanent: false },
      { source: "/services/:path*", destination: "/organizers", permanent: false },
      { source: "/venues", destination: "/organizers", permanent: false },
      { source: "/venues/:path*", destination: "/organizers", permanent: false },
    ];
  },
};

export default nextConfig;
