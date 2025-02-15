import Header from "@/components/Header";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-dark-200 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-dark opacity-80" />
      <div className="absolute inset-0 bg-gradient-spotlight opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(91,52,217,0.1),transparent_50%)] opacity-60" />
      <div className="absolute w-full h-full bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" />

      <Header />
      
      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-4xl mx-auto bg-dark-100/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/10 p-8 md:p-12">
          <ScrollArea className="h-full">
            <div className="prose prose-lg max-w-none prose-invert">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-coral-200 to-plum-200 text-transparent bg-clip-text mb-4">
                Terms of Service
              </h1>
              
              <div className="text-sm text-gray-400 mb-8">
                Last Updated: February 12, 2025
              </div>

              <div className="text-lg text-gray-400 mb-8">
                <strong>Welcome to Amorine!</strong> These Terms of Service ("<strong>Terms</strong>") govern your access to and use of <strong>Amorine</strong>, an AI conversational companion application operated by Nevaubi LLC ("<strong>Nevaubi</strong>" "<strong>we</strong>," or "<strong>us</strong>"). By creating an account or using the Amorine app or services (collectively, the "<strong>Service</strong>"), you agree to be bound by these Terms and our <Link to="/privacy-policy" className="text-coral hover:text-plum transition-colors">Privacy Policy</Link> (collectively referred to as the "<strong>Agreement</strong>"). If you do not agree with these Terms or the Privacy Policy, you must not use the Service.
              </div>

              <div className="text-lg text-gray-400 mb-8">
                These Terms apply to all users of Amorine. <strong>You must be 18 years or older</strong> to use Amorine. If you are not yet 18, do not use the Service.
              </div>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">1. Service Description and Purpose</h2>
                <p className="text-gray-400 mb-4">
                  <strong>What Amorine Is:</strong> Amorine is an AI-powered chatbot designed to be a conversational companion. It can chat with users on a variety of topics, providing entertainment, companionship, and general conversation. Amorine may learn from your interactions to personalize responses and improve your experience.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>What Amorine Is Not:</strong> Amorine is <strong>not a human</strong>, not a licensed therapist, medical professional, attorney, or any other kind of certified advisor. The content and responses generated by Amorine are for general informational and entertainment purposes only. <strong>Nothing communicated by Amorine should be considered professional advice or a substitute for therapy, medical advice, diagnosis, legal counsel, or any professional service.</strong>
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>No Medical or Emergency Use:</strong> You agree you will not use Amorine as a primary means to get medical or mental health advice, and you understand that it cannot adequately help in crisis situations. In case of an emergency or crisis (e.g., feeling suicidal or someone's health is at risk), <strong>do not rely on Amorine</strong> – instead, contact emergency services or a qualified professional immediately.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Service Modifications:</strong> Nevaubi LLC reserves the right to improve, modify, suspend, or discontinue the Service (or any part of it) at any time, with or without notice. We are constantly working to enhance Amorine, which means features may change or new features may be added. We will try to inform users of major changes, but this may not always be possible. You agree that Nevaubi is not liable to you or any third party for any modification, suspension, or discontinuation of the Service. (If you are a subscriber and a discontinuation affects you, see the <strong>Subscriptions and Payments</strong> section below for how we handle refunds in such cases.)
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">2. Account Registration and Security</h2>
                <p className="text-gray-400 mb-4">
                  To use Amorine, you need to create an account. You can sign up with an email and password or use a supported single sign-on option (like Google Sign-In). 
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Account Information:</strong> When registering, you agree to provide truthful, accurate, and complete information (including your name, a valid email, age range, etc.), and to keep this information up-to-date. You must not impersonate anyone or choose an offensive or infringing username. Nevaubi may refuse registration, or cancel a username, that violates these rules.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Eligibility:</strong> By registering, you represent that you are 18 or older and fully capable of entering into this Agreement. You also confirm that you have not been previously prohibited from using the Service.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account login credentials. <strong>Do not share your password</strong> or account access with others. You are responsible for all activities that occur under your account. If you suspect any unauthorized use of your account or a security breach, you must notify us immediately at our support email. Nevaubi is not liable for any loss or damage arising from your failure to secure your account.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Account Ownership:</strong> Your account is personal to you. You must not sell, transfer, or assign your account or any account rights to anyone else. Likewise, you should not use someone else's account without their permission.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">3. User Conduct and Acceptable Use</h2>
                <p className="text-gray-400 mb-4">
                  We want Amorine to be a safe and enjoyable experience for everyone. By using the Service, you agree to the following rules of conduct:
                </p>
                <ul className="list-disc pl-6 text-gray-400 space-y-2">
                  <li><strong>Lawful Use Only:</strong> You will use Amorine <strong>only for lawful purposes</strong> and in accordance with these Terms. You will not use the Service to engage in any unlawful, illegal, fraudulent, or harmful conduct.</li>
                  <li><strong>No Harassment or Hateful Content:</strong> You will not use Amorine to generate or share content that is harassing, threatening, defamatory, obscene, or hateful toward any individual or group. This includes content that is racist, sexist, homophobic, transphobic, ableist, or otherwise discriminatory or abusive.</li>
                  <li><strong>No Exploitation or Abuse:</strong> You will not exploit the AI to produce content that sexually exploits minors (strictly prohibited), depicts non-consensual activities, or any content that is extremely violent or otherwise could be deemed exploitative or abusive. Remember, use of Amorine is restricted to adults 18+, and any attempt to use it involving minors is a violation of these Terms and will result in account termination.</li>
                  <li><strong>No Spam or Commercial Use:</strong> You will not use Amorine to send spam, advertisements, solicitations, or any other unauthorized commercial communications. The Service is for your personal, non-commercial use only. You may not use automated scripts to collect information from or otherwise interact with the Service.</li>
                  <li><strong>No Impersonation:</strong> Do not misrepresent yourself as any other person or entity, or falsely imply any affiliation with Nevaubi or Amorine.</li>
                  <li><strong>Respect the Service’s Integrity:</strong> You agree not to disrupt, interfere with, or degrade the performance or security of Amorine. This includes <strong>no hacking, DDOS attacks, injecting malicious code, attempting to exploit vulnerabilities, or otherwise interfering with the normal functioning</strong> of the app or associated servers. You will not attempt to reverse engineer, decompile, or extract the source code of the Service or the AI model.</li>
                  <li><strong>Content Responsibility:</strong> You understand that any content you input into Amorine (your messages, prompts, or other contributions) must not violate any laws or third-party rights. You are solely responsible for the content you provide and any consequences that arise from it. Nevaubi does not pre-screen user input, but reserves the right to monitor or review it if a violation is suspected (as described further in Section 4 below).</li>
                  <li><strong>No Unauthorized Access:</strong> You will not attempt to access accounts that are not yours, penetrate any security measures, or otherwise use the Service in a way to gain unauthorized access to data.</li>
                  <li><strong>Compliance with Laws:</strong> You are responsible for complying with all applicable local, state, national, and international laws and regulations in your use of Amorine. If any laws applicable to you restrict or forbid your use of Amorine, you agree to refrain from using it. Nevaubi is not liable for any user’s violation of laws through use of the Service.</li>
                </ul>
                <p className="text-gray-400 mt-4">
                  If you violate any of these rules, or if we determine in our sole discretion that your conduct is harmful to the community or to the Service, we may suspend or terminate your account (see <strong>Termination</strong> section below). We may also take any legal action available for unlawful conduct.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">4. User Content and Monitoring</h2>
                <p className="text-gray-400 mb-4">
                  <strong>User Content:</strong> As you use Amorine, you may input text or other content (“<strong>User Content</strong>”) into the chat. All User Content remains <strong>yours</strong> – we do not claim ownership of the content you provide. However, by using the Service, you grant Nevaubi LLC a worldwide, non-exclusive, royalty-free, sublicensable <strong>license to use, store, reproduce, display, and distribute your User Content</strong> solely as necessary to operate and improve the Service. This license allows us, for example, to process your messages through our AI algorithms, to store your conversation history for your review, and to use anonymized versions of conversations to enhance our AI’s capabilities or for debugging. We will never publicly display or share your identifiable conversation content without your consent.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>AI-Generated Content:</strong> The responses and content generated by Amorine’s AI are automatically produced and are not directly authored by any human at Nevaubi. While we strive to make the AI’s output helpful and appropriate, it may occasionally produce incorrect or inappropriate content. By using the Service, you understand and accept this risk. We do <strong>not</strong> guarantee the accuracy, completeness, or usefulness of any AI-generated content. You agree that any reliance on or use of the AI’s output is at your own discretion and risk.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Monitoring and Moderation:</strong> Nevaubi does not actively monitor all User Content or chats in real-time. However, we reserve the right (but not the obligation) to review and monitor usage and content to ensure compliance with these Terms and to comply with law. This might include automated monitoring by the system for certain flagged keywords or behaviors for safety (for example, self-harm indications might prompt a helpful response or resources). In certain cases – such as reports from users or flags by our system – we may manually review conversation snippets to investigate abuse or a violation of these Terms.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Removal of Content:</strong> Nevaubi may remove or refuse to display any content that we believe, in our sole discretion, violates these Terms or is otherwise objectionable. We may also suspend or terminate accounts associated with such content. However, because the nature of Amorine is private one-to-one conversations between you and the AI, we generally will not interfere unless a serious violation comes to our attention (like use of the Service for clearly illicit activities or abusive harassment that is reported).
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Feedback:</strong> If you choose to provide suggestions, ideas, or feedback about Amorine (“<strong>Feedback</strong>”), you agree that we are free to use such Feedback in any way, for any purpose, without any restriction or compensation to you. Feedback can help us improve the Service, but providing it is optional.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">5. Subscriptions and Payments</h2>
                <p className="text-gray-400 mb-4">
                  <strong>Paid Features:</strong> Amorine may offer premium features or content that are accessible only through a paid subscription or one-time payments (“<strong>Subscription</strong>”). The specifics of what is included in a Subscription, the pricing, and the billing cycle will be provided within the app or on our website at the time of purchase. By electing to purchase a Subscription or any paid feature, you agree to the pricing and payment terms presented to you for that service.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Billing:</strong> Payments for subscriptions are processed securely by our third-party payment processor, <strong>Stripe</strong>. By subscribing, you authorize Stripe to charge your provided payment method (such as a credit card) for the recurring subscription fee. Subscriptions typically recur on a periodic basis (e.g., monthly or annually) as disclosed, and will continue until canceled.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Free Trials:</strong> If a free trial period is offered, you will not be charged during the trial. However, at the end of the trial, your subscription will automatically convert to a paid subscription and your payment method will be charged, unless you cancel before the trial ends. Details of any free trial (duration, what features it includes) will be provided at sign-up.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Renewals:</strong> <strong>Subscriptions automatically renew</strong> at the end of each billing cycle (e.g., your subscription will renew each month for monthly plans) unless you cancel beforehand. By default, renewal is for the same duration and at the same terms as the initial subscription. We will charge the subscription fee to the payment method on file. If pricing has changed, we will notify you in advance and give you an opportunity to cancel if you do not agree to the new price.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Cancellation:</strong> You can cancel a Subscription at any time via the account settings in the app or by contacting our support. If you cancel, your subscription will remain active until the end of the current paid period, and you will not be charged again after that. <strong>No pro-rated refunds</strong> will be provided for the remainder of the period after cancellation; you will simply retain access until your already-paid term expires.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Refund Policy:</strong> All fees and charges are <strong>non-refundable</strong> to the fullest extent permitted by law. This means that once a charge has occurred (or a renewal has processed), we do not offer refunds or credits for any unused time or features of the subscription term, unless required by applicable consumer protection laws or other laws. For example, if you accidentally subscribed and meant to cancel, or you didn’t use the service, in general we will not issue a refund for that period you paid for. However, we understand exceptional situations can occur. If you believe you have a valid reason for a refund (such as a serious defect in the service that we confirm, or you were mistakenly charged after cancellation), please contact support and we may review requests on a case-by-case basis. Any refunds granted are at our sole discretion.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Payment Issues:</strong> It is your responsibility to ensure your payment information is accurate and up to date. If a charge is not successful (e.g., your card expires or has insufficient funds), we may suspend or cancel your subscription. You agree to promptly update your payment method if needed. We reserve the right to retry billing your method if the initial attempt fails, and to contact you to resolve any billing issues.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Changes to Subscriptions:</strong> Nevaubi may modify the subscription plans, fees, or introduce new paid services. We will provide notice of significant changes to pricing or subscriptions (e.g., via email or in-app notification). Any increase in price or material changes to a subscription you are already paying for will take effect only after the current billing period (and any agreed promotional period) has ended, unless otherwise expressly stated. If you do not agree to the change, you must cancel the subscription before the next billing cycle. Continuing to use the paid service after the price change goes into effect constitutes your acceptance of the new prices.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Third-Party Purchases:</strong> If subscriptions or purchases are offered through an app store (like Apple App Store or Google Play) rather than directly via Stripe in-app, then the terms of that app store’s purchase and refund policies may apply. Be sure to review those if you subscribe through an external platform. (Currently, Amorine uses direct payment via Stripe, but this note is for potential future cases.)
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">6. Intellectual Property and License</h2>
                <p className="text-gray-400 mb-4">
                  <strong>Ownership:</strong> Amorine and all content, software, and other materials within the Service (excluding your User Content) are the property of Nevaubi LLC or our licensors and are protected by intellectual property laws. This includes the Amorine name, logo, all design elements, algorithms, code, text, graphics, and other content we provide ("<strong>Amorine Content</strong>"). All Amorine Content is provided to you <strong>for your personal use only</strong> as part of the Service. We reserve all rights not expressly granted to you.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Your License to Use Amorine:</strong> Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to download, install, and use Amorine on your personal device(s) and to access the Service solely for your personal, non-commercial use. You agree not to use Amorine for any resale, distribution, public performance, or other commercial purposes.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Restrictions:</strong> You may not copy, modify, distribute, sell, or lease any part of the Service or the included content, nor may you reverse engineer or attempt to extract the source code of any software, except to the extent that such restrictions are expressly prohibited by law. You may not use any meta tags or other "hidden text" utilizing "Amorine" or "Nevaubi" or any of our trademarks without our express written consent.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Content License from You:</strong> As noted in Section 4, any User Content you input remains yours, but you give us a license to use it for operating the Service. You also agree that we may collect and use de-identified, aggregated data derived from your usage (for example, overall usage statistics, or training data that cannot be linked to you personally) for improving Amorine and other legitimate purposes. This aggregated data will not identify you personally.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">7. Disclaimers of Warranty</h2>
                <p className="text-gray-400 mb-4">
                  <strong>Service Provided “AS IS”:</strong> Amorine is provided on an “<strong>AS IS</strong>” and “<strong>AS AVAILABLE</strong>” basis. While we endeavor to provide a great service, <strong>we make no warranties or guarantees that Amorine will meet your expectations or requirements, or that it will be uninterrupted, error-free, or secure</strong>. Use of the Service is at your own risk. 
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>AI Limitations:</strong> You acknowledge that AI technology is not perfect and the responses from Amorine may occasionally be inappropriate, incorrect, or offensive. Nevaubi does not warrant the quality, accuracy, or completeness of any information or content obtained through the Service. The AI’s responses do not reflect the opinions or endorsements of Nevaubi LLC, and we are not liable for any actions you take in reliance on those responses.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>No Professional Advice:</strong> Amorine’s content is not professional advice. <strong>Nevaubi disclaims any liability for any advice or information obtained through the Service</strong>. Any actions you take based on conversations with Amorine are solely at your own discretion. Always seek the advice of a qualified professional for any situation where professional guidance is needed.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>No Warranty:</strong> To the maximum extent allowed by applicable law, Nevaubi (on behalf of itself and its service providers) <strong>expressly disclaims all warranties and conditions of any kind</strong>, whether express, implied, or statutory, including but not limited to any implied warranties of title, non-infringement, merchantability, fitness for a particular purpose, and any warranties implied by course of performance or usage of trade. We do not guarantee that the Service will be error-free, virus-free, or that any defects will be corrected.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>External Services:</strong> Nevaubi is not responsible for the availability or quality of third-party services (such as your internet connection, devices, app stores, or the third-party services integrated into Amorine like Google or Stripe). We make no guarantee that those external services will function without disruption with Amorine. Any issues with third-party services are governed by your agreements with those third parties.
                </p>
                <p className="text-gray-400 mt-4">
                  Some jurisdictions do not allow the exclusion of certain warranties, so some of the above disclaimers may not apply to you. In such cases, the scope and duration of any warranty will be the minimum required under applicable law.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">8. Limitation of Liability</h2>
                <p className="text-gray-400 mb-4">
                  To the fullest extent permitted by law, in no event will Nevaubi LLC or its directors, officers, employees, agents, partners, or licensors be liable for any <strong>indirect, incidental, special, consequential, or punitive damages</strong>, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from: 
                </p>
                <ul className="list-disc pl-6 text-gray-400 space-y-2">
                  <li>your access to or use of (or inability to access or use) the Service;</li>
                  <li>any conduct or content of any third party on the Service, including any defamatory, offensive, or illegal conduct of other users or third parties;</li>
                  <li>any content obtained from the Service (including AI-generated responses); and</li>
                  <li>unauthorized access, use, or alteration of your transmissions or content.</li>
                </ul>
                <p className="text-gray-400 mb-4">
                  <strong>Maximum Liability:</strong> In no event shall Nevaubi’s total cumulative liability for all claims arising out of or relating to this Agreement or the use of the Service exceed the amount you have paid to Nevaubi for the Service in the twelve (12) months immediately preceding the event that gave rise to the claim, or <strong>$100 USD</strong>, whichever is greater. If you have not made any payments to Nevaubi (for example, if you only use free features), Nevaubi’s total liability shall be $50 or the minimum amount permitted by law.
                </p>
                <p className="text-gray-400 mb-4">
                  This limitation of liability applies whether the claims are based on warranty, contract, tort (including negligence), or any other legal theory, even if we have been advised of the possibility of such damages, and even if any limited remedy herein is found to have failed its essential purpose.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Exceptions:</strong> Nothing in these Terms is intended to exclude or limit liability that cannot be excluded under law – for example, liability for personal injury or death resulting from our negligence or for fraud may not be excluded in certain jurisdictions. In those jurisdictions, our liability will be limited to the greatest extent permitted by law.
                </p>
                <p className="text-gray-400 mb-4">
                  You acknowledge and agree that the foregoing limitations of liability, together with the other provisions in these Terms that limit liability, are essential terms and that Nevaubi would not be willing to grant you the rights set forth in these Terms but for your agreement to the above limitations of liability.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">9. Indemnification</h2>
                <p className="text-gray-400 mb-4">
                  You agree to <strong>indemnify, defend, and hold harmless Nevaubi LLC</strong>, its affiliates, and their respective directors, officers, employees, and agents, from and against any and all claims, liabilities, damages, losses, and expenses (including reasonable attorneys’ fees and costs) that arise out of or relate to: 
                </p>
                <ul className="list-disc pl-6 text-gray-400 space-y-2">
                  <li>your use or misuse of Amorine,</li>
                  <li>your violation of these Terms or any law or regulation,</li>
                  <li>your violation of any rights of any third party (for example, infringement of intellectual property or privacy rights), or</li>
                  <li>any content you provide through the Service causing damage to a third party.</li>
                </ul>
                <p className="text-gray-400 mb-4">
                  We reserve the right, at our own expense, to assume the exclusive defense and control of any matter otherwise subject to indemnification by you (in which case you agree to cooperate with us in asserting any available defenses). This indemnity obligation will survive the termination or expiration of your relationship with Amorine and these Terms.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">10. Dispute Resolution and Arbitration</h2>
                <p className="text-gray-400 mb-4">
                  <strong>Informal Resolution:</strong> We encourage you to contact us first if you have any dispute, claim, or controversy arising out of or relating to Amorine or these Terms. Many concerns can be resolved quickly and to your satisfaction by reaching out to our support team. We will try in good faith to resolve any dispute or claim informally. 
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Binding Arbitration:</strong> If we cannot resolve a dispute informally, you and Nevaubi LLC <strong>agree that any dispute, claim, or controversy arising out of or relating in any way to your use of Amorine or these Terms</strong> (including the validity, enforceability, or scope of this arbitration provision) <strong>shall be finally resolved by binding arbitration</strong> on an individual basis. <strong>You are giving up the right to litigate (or participate in as a party or class member) all disputes in court before a judge or jury.</strong>
                </p>
                <p className="text-gray-400 mb-4">
                  This arbitration provision is governed by the Federal Arbitration Act (9 U.S.C. §§ 1–16) and evidences a transaction in interstate commerce. Arbitration will be administered by a neutral arbitrator through a reputable arbitration provider (such as the <strong>American Arbitration Association (AAA)</strong>) and conducted under the rules of that provider, except as modified here. The arbitration may be conducted in English and, unless you and Nevaubi agree otherwise, will take place in a reasonably convenient location for both parties or via teleconference/videoconference if in-person is not feasible.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Arbitration Procedure:</strong> To start an arbitration, you must send a written notice to us at our contact address provided, briefly describing the nature of your dispute and the relief you seek. We will engage in the selection of an arbitrator in line with the chosen provider’s rules. The arbitrator has the authority to grant any remedy that would be available in court under law, but <strong>no</strong> arbitrator has authority to award relief to any person other than the individual claimant.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Exceptions to Arbitration:</strong> Either you or we may <strong>choose to bring an individual action in a small claims court</strong> for disputes or claims within the scope of that court’s jurisdiction <strong>instead of</strong> proceeding to arbitration. Also, either party may bring suit in court to seek an injunction or other equitable relief for matters relating to intellectual property infringement or misuse of the Service (e.g., unauthorized use of Amorine’s technology or trademarks) without first engaging in arbitration.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Class Action Waiver:</strong> <strong>You and Nevaubi agree that any proceedings (whether in arbitration or court) will be conducted only on an individual basis and not in a class, consolidated, or representative action.</strong> You further agree that the arbitrator may not consolidate more than one person’s claims and may not otherwise preside over any form of a representative or class proceeding. <strong>YOU WAIVE ANY RIGHT TO PARTICIPATE IN ANY CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.</strong>
                </p>
                <p className="text-gray-400 mb-4">
                  If this class action waiver or the entirety of this arbitration section is found to be unenforceable by a court of competent jurisdiction, then the entirety of this arbitration section shall be null and void and, in that case, you and Nevaubi agree that the exclusive jurisdiction and venue described in Section 11 (Governing Law & Jurisdiction) will govern any action arising out of or related to these Terms.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Opt-Out:</strong> We believe arbitration benefits both parties, but if you do not wish to agree to this arbitration provision, you have the right to opt out. You may opt out of this arbitration agreement by sending a written notice of your decision to opt out to our contact address (provided at the end of these Terms) or email within <strong>30 days</strong> of first accepting these Terms. Your notice must include your name, your account information (if any), and a clear statement that you want to opt out of this arbitration agreement. If you opt out, neither you nor Nevaubi can require the other to participate in arbitration for disputes; instead, any disputes will be resolved in court as set forth in Section 11. Opting out of this arbitration agreement will not affect any other parts of these Terms, including the class action waiver.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Fees:</strong> Each party shall pay its own arbitration filing fees, administrative and arbitrator fees as required by the arbitration rules, except that Nevaubi will pay your reasonable share of such fees if your claim for damages does not exceed a certain amount (for example, $10,000), unless the arbitrator finds your claims to be frivolous. In that case, the arbitrator may require you to bear some or all of the fees as permitted by the arbitration rules.
                </p>
                <p className="text-gray-400 mb-4">
                  <strong>Survival:</strong> This arbitration agreement will survive the termination of your relationship with Nevaubi.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">11. Governing Law and Jurisdiction</h2>
                <p className="text-gray-400 mb-4">
                  These Terms and any dispute arising out of or related to them or the Service will be governed by and construed in accordance with the laws of the <strong>State of Illinois, USA</strong>, and applicable federal law, without giving effect to any conflict of laws principles that would cause the laws of another jurisdiction to apply.
                </p>
                <p className="text-gray-400 mb-4">
                  Subject to the <strong>Dispute Resolution and Arbitration</strong> section above, you agree that any non-arbitrable legal action or proceeding arising out of or relating to these Terms or Amorine shall be brought exclusively in the federal or state courts located in <strong>Cook County, Illinois, USA</strong>. You and Nevaubi both consent to the venue and personal jurisdiction of such courts. You also agree to waive any objections based on inconvenient forum or jurisdiction.
                </p>
                <p className="text-gray-400 mb-4">
                  If you are using Amorine outside of the United States, you do so at your own initiative and are responsible for compliance with any local laws. We make no representations that the Service is appropriate or available for use in other locations. Those who access or use the Service from other jurisdictions do so voluntarily and are responsible for compliance with local law.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-400 mb-4">Contact Information</h2>
                <p className="text-gray-400">
                  If you have any questions or concerns about these Terms or the Service, please contact us at:
                </p>
                <div className="mt-4 p-6 bg-cream rounded-xl">
                  <strong className="block text-gray-400">Nevaubi LLC – Amorine Support</strong>
                  <a href="mailto:amorineapp@gmail.com" className="text-coral hover:text-plum transition-colors">
                    amorineapp@gmail.com
                  </a>
                </div>
              </section>
            </div>
          </ScrollArea>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
