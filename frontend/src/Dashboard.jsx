import React from "react";
import {
  LayoutDashboard,
  GraduationCap,
  User,
  Search,
  Bot,
  FileText,
  ClipboardList,
  Settings,
  Bell,
  ArrowUpRight,
  Sparkles,
  Clock,
  CheckCircle,
  Menu
} from "lucide-react";

import { motion } from "framer-motion";

const scholarships = [
  {
    name: "Post Matric Scholarship",
    department: "Government of Maharashtra",
    amount: "As per scheme",
    status: "Explore",
    color: "bg-blue-100 text-blue-700"
  },
  {
    name: "Rajarshi Chhatrapati Shahu Maharaj",
    department: "Higher Education",
    amount: "As per eligibility",
    status: "Explore",
    color: "bg-purple-100 text-purple-700"
  },
  {
    name: "Merit Based Scholarship",
    department: "Education Department",
    amount: "As per scheme",
    status: "Explore",
    color: "bg-emerald-100 text-emerald-700"
  }
];

const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "My Profile", icon: User },
  { name: "Explore Scholarships", icon: GraduationCap },
  { name: "AI Recommendations", icon: Sparkles },
  { name: "Eligibility Checker", icon: CheckCircle },
  { name: "AI Assistant", icon: Bot },
  { name: "My Documents", icon: FileText },
  { name: "Application Tracker", icon: ClipboardList }
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] flex">

      {/* SIDEBAR */}

      <aside className="hidden lg:flex w-64 bg-[#10182D] text-white flex-col p-6">

        <div className="text-2xl font-bold tracking-tight mb-12">
          LifeAdmin<span className="text-violet-400">.</span>
          <p className="text-xs text-gray-400 font-normal mt-1">
            SMART SCHOLARSHIP ASSISTANT
          </p>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          MAIN MENU
        </p>

        <nav className="space-y-2">

          {menuItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${
                  index === 0
                    ? "bg-violet-600 text-white"
                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} />
                {item.name}
              </button>
            );
          })}

        </nav>

        <div className="mt-auto bg-white/5 rounded-2xl p-4">
          <Sparkles className="text-violet-400 mb-3" />

          <h3 className="font-semibold text-sm">
            Need assistance?
          </h3>

          <p className="text-xs text-gray-400 mt-2">
            Ask our AI assistant about scholarships and government schemes.
          </p>

          <button className="mt-4 text-sm text-violet-300">
            Chat with AI →
          </button>
        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="flex-1 min-w-0 p-5 md:p-8">

        {/* HEADER */}

        <header className="flex justify-between items-center mb-9">

          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#172033]">
              Welcome back, Sanskar 👋
            </h1>

            <p className="text-gray-500 mt-2 text-sm">
              Your personal scholarship assistant is ready.
            </p>
          </div>

          <div className="flex gap-3 items-center">

            <button className="p-3 bg-white rounded-xl border border-gray-200">
              <Bell size={20} />
            </button>

            <div className="hidden sm:flex items-center gap-3 bg-white p-2 pr-5 rounded-xl border border-gray-200">
              <div className="w-9 h-9 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center font-bold">
                S
              </div>

              <span className="text-sm font-semibold">
                Student
              </span>
            </div>

          </div>

        </header>

        {/* AI SEARCH */}

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#222B55] via-[#4338A8] to-[#7655D9] p-7 md:p-10 text-white mb-8">

          <div className="relative z-10 max-w-2xl">

            <div className="flex items-center gap-2 text-violet-200 text-sm mb-4">
              <Sparkles size={17} />
              YOUR AI-POWERED SCHOLARSHIP ASSISTANT
            </div>

            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              Find opportunities.
              <br />
              Unlock your future.
            </h2>

            <p className="text-violet-100 mt-4 mb-7">
              Discover scholarships, check your eligibility and get
              personalized guidance with LifeAdmin AI.
            </p>

            <div className="bg-white rounded-2xl p-2 flex items-center gap-2 max-w-xl">

              <Search className="text-gray-400 ml-3" />

              <input
                placeholder="Search scholarships or ask AI anything..."
                className="flex-1 min-w-0 outline-none text-gray-800 text-sm p-2"
              />

              <button className="bg-[#5945C7] text-white px-5 py-3 rounded-xl text-sm font-semibold">
                Search
              </button>

            </div>

          </div>

          <div className="absolute right-10 bottom-0 opacity-10">
            <GraduationCap size={230} />
          </div>

        </section>

        {/* STATISTICS */}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-9">

          {[
            {
              title: "Scholarships Available",
              value: "Explore",
              icon: GraduationCap,
              color: "bg-blue-100 text-blue-600"
            },
            {
              title: "Recommended Schemes",
              value: "Discover",
              icon: Sparkles,
              color: "bg-purple-100 text-purple-600"
            },
            {
              title: "Applications",
              value: "Track",
              icon: ClipboardList,
              color: "bg-emerald-100 text-emerald-600"
            },
            {
              title: "Pending Documents",
              value: "Manage",
              icon: FileText,
              color: "bg-orange-100 text-orange-600"
            }
          ].map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={index}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
              >

                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color}`}>
                  <Icon size={22} />
                </div>

                <p className="text-gray-500 text-sm mt-5">
                  {item.title}
                </p>

                <h3 className="text-2xl font-bold text-[#172033] mt-2">
                  {item.value}
                </h3>

              </motion.div>
            );
          })}

        </section>

        {/* SCHOLARSHIPS */}

        <section className="mb-9">

          <div className="flex justify-between items-center mb-5">

            <div>
              <h2 className="text-xl font-bold text-[#172033]">
                Explore Scholarships
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Discover opportunities from verified sources.
              </p>
            </div>

            <button className="text-violet-600 text-sm font-semibold">
              View all →
            </button>

          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">

            {scholarships.map((item, index) => (

              <motion.div
                key={index}
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
              >

                <div className={`w-fit px-3 py-1 rounded-full text-xs font-semibold ${item.color}`}>
                  {item.status}
                </div>

                <h3 className="font-bold text-lg text-[#172033] mt-5">
                  {item.name}
                </h3>

                <p className="text-sm text-gray-500 mt-2">
                  {item.department}
                </p>

                <div className="border-t mt-5 pt-4 flex justify-between items-center">

                  <div>
                    <p className="text-xs text-gray-400">
                      Financial assistance
                    </p>

                    <p className="font-semibold text-sm mt-1">
                      {item.amount}
                    </p>
                  </div>

                  <button className="text-violet-600">
                    <ArrowUpRight />
                  </button>

                </div>

              </motion.div>

            ))}

          </div>

        </section>

        {/* AI ASSISTANT */}

        <section className="bg-white rounded-3xl border border-gray-100 p-7 md:p-9">

          <div className="flex items-center gap-4">

            <div className="w-14 h-14 bg-violet-100 text-violet-700 rounded-2xl flex items-center justify-center">
              <Bot size={30} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#172033]">
                Meet your AI Assistant
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Your intelligent companion for scholarship guidance.
              </p>
            </div>

          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-7">

            {[
              "Find scholarships for engineering students",
              "Explain Maharashtra government schemes",
              "Check my scholarship eligibility",
              "What documents do I need?"
            ].map((question, index) => (

              <button
                key={index}
                className="text-left border border-gray-200 rounded-xl p-4 text-sm hover:border-violet-400 hover:bg-violet-50 transition"
              >
                {question}
                <ArrowUpRight size={16} className="inline ml-2 text-violet-600" />
              </button>

            ))}

          </div>

          <button className="mt-7 bg-[#5945C7] text-white px-7 py-3 rounded-xl font-semibold text-sm hover:bg-[#4634AA] transition">
            Start Chatting with AI →
          </button>

        </section>

        <footer className="text-center text-xs text-gray-400 mt-10">
          © 2026 LifeAdmin AI. Your personal scholarship companion.
        </footer>

      </main>

    </div>
  );
}