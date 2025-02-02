import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="grid-background absolute inset-0 opacity-30" />
      
      <div className="container mx-auto px-4 pt-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary text-transparent bg-clip-text animate-float">
            Your Always-Available Companion
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A judgment-free space for meaningful connection, emotional support, and playful moments that evolve with you
          </p>
          <button
            onClick={() => navigate("/chat")}
            className="bg-gradient-primary text-white px-8 py-4 rounded-full text-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Meet Amorine →
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          {[
            "24/7 Emotional Availability",
            "Memory That Grows With You",
            "Always Respectful & Supportive"
          ].map((text, i) => (
            <div
              key={i}
              className="bg-cream p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">{text}</h3>
              <div className="w-16 h-16 bg-gradient-primary rounded-full opacity-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;