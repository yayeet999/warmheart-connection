import Header from "@/components/Header";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cream relative">
      <div className="grid-background absolute inset-0 opacity-20" />
      <Header />
      
      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-8 md:p-12">
          <ScrollArea className="h-full">
            <div className="prose prose-lg max-w-none">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-coral to-plum text-transparent bg-clip-text mb-4">
                Amorine Privacy Policy
              </h1>
              
              <div className="text-sm text-charcoal/60 mb-8">
                Last Updated: February 12, 2025
              </div>

              <div className="text-lg text-charcoal/80 mb-8">
                <strong>Introduction</strong><br />
                Nevaubi LLC ("we," "us," or "our") operates Amorine, an AI conversational companion application (the "Service"). We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains what data we collect from users of Amorine, how we use and protect that data, and your rights regarding your information. By using Amorine, you agree to the collection and use of information in accordance with this policy. Users must be <strong>18 years or older</strong> to use Amorine.
              </div>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-charcoal mb-4">1. Information We Collect</h2>
                <p className="text-charcoal/80 mb-4">
                  We only collect the personal information necessary to provide and personalize the Amorine experience. This includes:
                </p>
                <ul className="list-disc pl-6 text-charcoal/80 space-y-2">
                  <li><strong>User Name:</strong> A display name or username you provide, used to personalize your experience in conversations.</li>
                  <li><strong>Age Range:</strong> Your age range (we only allow 18+), used to ensure compliance with age restrictions and to tailor content appropriately.</li>
                  <li><strong>Pronouns:</strong> The pronouns you provide (e.g., he/him, she/her, they/them), used for personalization so that Amorine refers to you correctly.</li>
                  <li><strong>Email Address:</strong> Collected when you create an account or sign in (including via Google). This is used for account verification, login, password resets, and important communications about the Service.</li>
                  <li><strong>Message History:</strong> The content of your conversations with Amorine. We store your chat history to provide context for future conversations and improve personalization.</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-charcoal mb-4">2. How We Use Your Information</h2>
                <p className="text-charcoal/80 mb-4">
                  We use the collected information strictly to operate and improve Amorine and to provide you with a personalized, engaging experience. Specifically, we use your data for:
                </p>
                <ul className="list-disc pl-6 text-charcoal/80 space-y-2">
                  <li><strong>Personalization:</strong> Your name, pronouns, and message history allow Amorine to respond in a more personalized and context-aware manner.</li>
                  <li><strong>Service Delivery:</strong> Your email and login data are used to create and secure your account.</li>
                  <li><strong>Maintenance and Improvements:</strong> We may review anonymized usage data or chat interactions to troubleshoot issues.</li>
                  <li><strong>Security:</strong> Technical information may be used to detect and prevent fraudulent activity.</li>
                  <li><strong>Communication:</strong> We may use your email to send you service updates.</li>
                </ul>
                <p className="text-charcoal/80 mt-4">
                  We <strong>do not</strong> use personal data for any form of advertising profiling, nor do we <strong>sell</strong> or <strong>rent</strong> your personal information to any third parties.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-charcoal mb-4">3. Data Storage and Security</h2>
                <p className="text-charcoal/80 mb-4">
                  All user data is stored securely on our backend servers. We utilize modern cloud infrastructure and databases to host and manage data. Your personal information and message history are protected by several security measures:
                </p>
                <ul className="list-disc pl-6 text-charcoal/80 space-y-2">
                  <li><strong>Secure Storage:</strong> Data is stored in secure databases with encryption at rest and in transit.</li>
                  <li><strong>Limited Access:</strong> Personal data is accessible only to authorized Amorine developers and personnel.</li>
                  <li><strong>Access Controls:</strong> We implement authentication and access controls to prevent unauthorized access.</li>
                  <li><strong>Third-Party Security:</strong> When we use third-party services for data hosting, we ensure they employ strong security measures.</li>
                  <li><strong>Payment Information:</strong> If you make payments through Amorine, payments are processed by Stripe, a PCI-DSS compliant payment processor.</li>
                  <li><strong>No Outsourcing of Data:</strong> We do not outsource data processing in a way that exposes your personal data to unmanaged third parties.</li>
                </ul>
                <p className="text-charcoal/80 mt-4">
                  Despite our best efforts, no method of transmission over the internet or electronic storage is 100% secure.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-charcoal mb-4">4. Third-Party Services</h2>
                <p className="text-charcoal/80 mb-4">
                  Amorine integrates a few third-party services to function seamlessly. We disclose these here, along with what data they handle, to maintain transparency:
                </p>
                <ul className="list-disc pl-6 text-charcoal/80 space-y-2">
                  <li><strong>Stripe (Payments):</strong> We use Stripe to process transactions. Stripe’s handling of your data is governed by Stripe’s Privacy Policy.</li>
                  <li><strong>Google (Authentication):</strong> Amorine offers the option to sign up or log in using Google (OAuth).</li>
                  <li><strong>Vercel (Hosting):</strong> Our application front-end and servers are hosted on Vercel’s cloud platform.</li>
                  <li><strong>Supabase (Database):</strong> We use Supabase as our primary database service for storing user information and message history.</li>
                  <li><strong>Upstash (Caching/Queues):</strong> Amorine may utilize Upstash for quick data retrieval and message processing.</li>
                </ul>
                <p className="text-charcoal/80 mt-4">
                  We have made efforts to ensure that all third-party services we use are reputable and have their own strong privacy and data protection commitments.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-charcoal mb-4">5. No Selling or Sharing of Personal Data</h2>
                <p className="text-charcoal/80 mb-4">
                  We want to reassure you that your personal information is <strong>not</strong> sold or rented to any third parties. We do not share your personal data with outside parties for their own marketing or business purposes.
                </p>
                <p className="text-charcoal/80 mt-4">
                  The only circumstances under which we would disclose personal information are the following:
                </p>
                <ul className="list-disc pl-6 text-charcoal/80 space-y-2">
                  <li><strong>With Your Consent:</strong> If we ever want to use your data in a way not covered by this Privacy Policy, we will ask for your explicit consent.</li>
                  <li><strong>Legal Obligations:</strong> If required by law, regulation, legal process, or governmental request.</li>
                  <li><strong>Protection of Rights:</strong> We may share information if necessary to enforce our Terms of Service.</li>
                  <li><strong>Business Transfers:</strong> In the event that Nevaubi LLC is involved in a merger, acquisition, sale of assets, or reorganization.</li>
                </ul>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-charcoal mb-4">6. Your Rights and Choices</h2>
                <p className="text-charcoal/80 mb-4">
                  We strive to comply with all applicable data privacy laws, providing you with certain rights regarding your personal information.
                </p>
                <ul className="list-disc pl-6 text-charcoal/80 space-y-2">
                  <li><strong>Access and Portability:</strong> You have the right to request a copy of the personal data we hold about you.</li>
                  <li><strong>Rectification:</strong> If any personal information we have is incorrect or outdated, you have the right to request a correction.</li>
                  <li><strong>Erasure (Right to be Forgotten):</strong> You may request that we delete your personal data.</li>
                  <li><strong>Restriction of Processing:</strong> You can ask us to limit how we use your data in certain circumstances.</li>
                  <li><strong>Objection:</strong> You have the right to object to our processing of your data if you feel it impacts your fundamental rights and freedoms.</li>
                  <li><strong>Withdrawal of Consent:</strong> If we rely on your consent to process any personal data, you can withdraw that consent at any time.</li>
                  <li><strong>Non-Discrimination (CCPA specific):</strong> If you are a California resident, you have the right not to receive discriminatory treatment for exercising your CCPA privacy rights.</li>
                  <li><strong>Do Not Sell (CCPA):</strong> As noted, we do not sell personal data.</li>
                </ul>
                <p className="text-charcoal/80 mt-4">
                  To exercise any of these rights, please contact us at our support email provided at the end of this policy.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-charcoal mb-4">7. Account Deletion and Data Retention</h2>
                <p className="text-charcoal/80 mb-4">
                  <strong>Account Deletion:</strong> You have the option to delete your Amorine account at any time.
                </p>
                <p className="text-charcoal/80 mt-4">
                  <strong>Data Retention:</strong> We retain your personal information only for as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy.
                </p>
                <p className="text-charcoal/80 mt-4">
                  <strong>Data Requests:</strong> If you want to know what data we have about you, you can contact us at the support email below.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-charcoal mb-4">8. International Users and Data Transfers</h2>
                <p className="text-charcoal/80 mb-4">
                  Nevaubi LLC is based in the United States, and Amorine is primarily operated from the U.S. If you are accessing Amorine from outside the United States, be aware that your information will be transferred to, stored, and processed in the United States.
                </p>
                <p className="text-charcoal/80 mt-4">
                  By using Amorine, you understand that your information will be transferred to our servers and those third parties we share data with in the United States or other jurisdictions as needed for the Service to be provided.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-charcoal mb-4">9. Children’s Privacy</h2>
                <p className="text-charcoal/80 mb-4">
                  Amorine is <strong>not intended for anyone under the age of 18.</strong>
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mb-12">
                <h2 className="text-2xl font-bold text-charcoal mb-4">10. Changes to this Privacy Policy</h2>
                <p className="text-charcoal/80 mb-4">
                  We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or for other operational reasons.
                </p>
                <p className="text-charcoal/80 mt-4">
                  We encourage you to review this Privacy Policy periodically for any updates.
                </p>
              </section>

              <Separator className="my-8" />

              <section className="mt-12">
                <h2 className="text-2xl font-bold text-charcoal mb-4">11. Contact Us</h2>
                <p className="text-charcoal/80">
                  If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us at:
                </p>
                <div className="mt-4 p-6 bg-cream rounded-xl">
                  <strong className="block text-charcoal">Nevaubi LLC – Amorine Support</strong>
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

export default PrivacyPolicy;
