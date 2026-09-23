import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#090a0c] text-[#f0f1f2]">
      <Card className="w-full max-w-lg mx-4 border border-white/10 bg-[#14171b] text-[#f0f1f2] shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-white/5 animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-[#d1d5da]" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-[#f0f1f2] mb-2">404</h1>

          <h2 className="text-xl font-semibold text-[#d1d5da] mb-4">
            Page Not Found
          </h2>

          <p className="text-[#858d99] mb-8 leading-relaxed">
            Sorry, the page you are looking for doesn't exist.
            <br />
            It may have been moved or deleted.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="bg-[#f0f1f2] hover:bg-white text-[#090a0c] px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
