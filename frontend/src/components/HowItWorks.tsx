import { ClipboardList, Calendar, Trophy, Users } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: ClipboardList,
    title: "Create Your Tournament",
    description: "Set up your tournament details, rules, and format in minutes with our intuitive platform.",
  },
  {
    icon: Users,
    title: "Invite Teams",
    description: "Send invitations to teams and manage registrations seamlessly through our system.",
  },
  {
    icon: Calendar,
    title: "Schedule Matches",
    description: "Automatically generate fixtures and manage match schedules with conflict detection.",
  },
  {
    icon: Trophy,
    title: "Track & Celebrate",
    description: "Monitor live scores, standings, and crown your champions with digital certificates.",
  },
];

export default function HowItWorks() {
  return (
    <section id="about" className="py-20 bg-gray-900">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            How It <span className="text-yellow-500">Works</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Launch your tournament in four simple steps
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-600/20 rounded-lg p-6 hover:border-yellow-500/50 transition-all duration-300 h-full">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-4">
                      <Icon className="w-8 h-8 text-black" />
                    </div>
                    
                    <div className="absolute -top-3 -left-3 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center font-bold text-black text-lg">
                      {index + 1}
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-3">
                      {step.title}
                    </h3>
                    
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <div className="w-8 h-0.5 bg-yellow-500/30" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
