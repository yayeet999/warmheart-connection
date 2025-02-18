import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ProfileType {
  suicide_concern?: number;
  violence_concern?: number;
  extreme_content?: string;
}

interface ChatDialogsProps {
  showWelcomeDialog: boolean;
  setShowWelcomeDialog: (open: boolean) => void;
  isFreeUser: boolean;
  showLimitReachedDialog: boolean;
  setShowLimitReachedDialog: (open: boolean) => void;
  showTokenDepletedDialog: boolean;
  setShowTokenDepletedDialog: (open: boolean) => void;
  showSuspensionDialog: boolean;
  setShowSuspensionDialog: (open: boolean) => void;
  profile: ProfileType | null;
  handleSubscribe: () => Promise<void>;
}

const SUICIDE_RESOURCES = `National Suicide Prevention Lifeline (24/7):
1-800-273-8255

Crisis Text Line (24/7):
Text HOME to 741741

Veterans Crisis Line:
1-800-273-8255 (Press 1)

Trevor Project (LGBTQ+):
1-866-488-7386

Please seek professional help immediately. Your life matters.`;

const VIOLENCE_RESOURCES = `National Crisis Hotline (24/7):
1-800-662-4357

Crisis Text Line (24/7):
Text HOME to 741741

National Domestic Violence Hotline:
1-800-799-SAFE (7233)

Please seek professional help immediately if you're having thoughts of harming others.`;

export const ChatDialogs: React.FC<ChatDialogsProps> = ({
  showWelcomeDialog,
  setShowWelcomeDialog,
  isFreeUser,
  showLimitReachedDialog,
  setShowLimitReachedDialog,
  showTokenDepletedDialog,
  setShowTokenDepletedDialog,
  showSuspensionDialog,
  setShowSuspensionDialog,
  profile,
  handleSubscribe,
}) => {
  return (
    <>
      {/* ======================
          FREE TIER WELCOME
      ======================= */}
      <Dialog
        open={showWelcomeDialog && isFreeUser}
        onOpenChange={setShowWelcomeDialog}
      >
        <DialogContent className="p-0 gap-0 w-[85vw] sm:w-[440px] max-w-[440px] overflow-hidden bg-dark-100/95 backdrop-blur-xl rounded-2xl">
          <div className="relative w-full h-[160px] sm:h-[200px] rounded-t-2xl overflow-hidden">
            <img
              src="/lovable-uploads/amorine_hero.webm"
              alt="hero"
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
          </div>
          <div className="relative z-20 -mt-6 px-4 sm:px-6 pb-3 sm:pb-5">
            <DialogHeader className="space-y-2 sm:space-y-3">
              <DialogTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-coral-100 to-plum-100 text-transparent bg-clip-text font-serif text-center tracking-tight">
                Unlock Amorine PRO
              </DialogTitle>
              <DialogDescription className="text-[15px] sm:text-[16px] text-white/90 font-serif text-center leading-relaxed px-2">
                Unlock more messaging, memory, images, and more.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2 text-white/90 text-sm sm:text-base font-serif leading-relaxed">
              <p>• Unlimited daily messages</p>
              <p>• Generate images on demand</p>
              <p>• Additional memory and persona depth</p>
            </div>

            <DialogFooter className="mt-2 sm:mt-3">
              <Button
                onClick={handleSubscribe}
                className="w-full bg-gradient-primary hover:opacity-90 text-white font-serif text-[15px] sm:text-[16px] py-2.5 sm:py-3"
              >
                Upgrade to Pro
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowWelcomeDialog(false)}
                className="w-full text-white/80 hover:text-white font-serif text-[15px] sm:text-[16px] py-2.5 sm:py-3 hover:bg-dark-200/40 transition-colors tracking-wide"
              >
                Continue with Free Plan
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================
          SUSPENSION DIALOG
      ======================= */}
      <Dialog open={showSuspensionDialog} onOpenChange={setShowSuspensionDialog}>
        <DialogContent className="sm:max-w-md" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="text-red-600">Account Suspended</DialogTitle>
            <DialogDescription className="space-y-4">
              <p className="font-medium">
                Your account has been suspended due to multiple safety violations.
              </p>
              <p>Please email amorineapp@gmail.com for support.</p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg whitespace-pre-line text-sm text-gray-600">
                {profile?.suicide_concern === 5
                  ? SUICIDE_RESOURCES
                  : VIOLENCE_RESOURCES}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => window.location.href = "/"}>
              Return to Home
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================
          DAILY-LIMIT REACHED
      ======================= */}
      <Dialog
        open={showLimitReachedDialog}
        onOpenChange={() => {}}
        modal
      >
        <DialogContent className="p-0 gap-0 w-[95vw] md:w-[85vw] lg:w-[75vw] max-w-[1200px] h-auto md:h-auto lg:aspect-video">
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-r from-coral-500 to-plum-500 text-white">
            <DialogClose className="absolute top-3 right-3 rounded-full text-white hover:bg-white/20 p-1">
              ✕
            </DialogClose>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Daily Limit Reached</h2>
            <p className="mb-4 text-center max-w-xl font-serif text-sm sm:text-base leading-relaxed">
              You've reached your daily message limit for our Free Plan. Upgrade to PRO for unlimited chatting and images.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <Button
                onClick={handleSubscribe}
                className="bg-white/20 hover:bg-white/10 text-white px-6 py-3 rounded-md"
              >
                Upgrade to Pro
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowLimitReachedDialog(false)}
                className="text-white border-white/50 hover:bg-white/10 px-6 py-3 rounded-md"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================
          TOKEN-BALANCE DEPLETED
      ======================= */}
      <Dialog
        open={showTokenDepletedDialog}
        onOpenChange={setShowTokenDepletedDialog}
        modal
      >
        <DialogContent className="p-0 gap-0 w-[95vw] md:w-[85vw] lg:w-[75vw] max-w-[1200px] h-auto md:h-auto lg:aspect-video">
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-r from-coral-500 to-plum-500 text-white">
            <DialogClose className="absolute top-3 right-3 rounded-full text-white hover:bg-white/20 p-1">
              ✕
            </DialogClose>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Token Balance Depleted</h2>
            <p className="mb-4 text-center max-w-xl font-serif text-sm sm:text-base leading-relaxed">
              You've used up all your tokens for image generation or messages on your Pro plan. Purchase more tokens or wait until your balance refreshes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <Button
                onClick={handleSubscribe}
                className="bg-white/20 hover:bg-white/10 text-white px-6 py-3 rounded-md"
              >
                Get More Tokens
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTokenDepletedDialog(false)}
                className="text-white border-white/50 hover:bg-white/10 px-6 py-3 rounded-md"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
export { ChatDialogs };
