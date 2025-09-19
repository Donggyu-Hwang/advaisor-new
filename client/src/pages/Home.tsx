import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="relative">
      {/* 히어로 섹션 */}
      <section className="text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-tight">
            <span className="text-gradient">AI 기반</span>
            <br />
            IR 분석 시스템
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-8 leading-relaxed">
            투자 유치 자료를 업로드하면 전문 AI 에이전트가 심층 분석하여
            <br />
            전문적인 컨설팅 보고서를 자동으로 생성합니다
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="btn-primary btn-glow text-lg px-8 py-4 flex items-center justify-center"
                >
                  대시보드로 이동
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  to="/upload"
                  className="px-8 py-4 border-2 border-primary-500 text-primary-500 rounded-2xl font-bold hover:bg-primary-500 hover:text-white transition-all duration-300 "
                >
                  새 분석 시작
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="btn-primary btn-glow text-lg px-8 py-4"
                >
                  무료로 시작하기
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 border-2 border-primary-500 text-primary-500 rounded-2xl font-bold hover:bg-primary-500 hover:text-white transition-all duration-300"
                >
                  로그인
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* 특징 섹션 */}
      <section className="py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            왜 advAIsor를 선택해야 할까요?
          </h2>
          <p className="text-xl text-gray-700">
            최첨단 AI 기술로 IR 분석의 새로운 표준을 제시합니다
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Zap className="w-8 h-8" />,
              title: "초고속 분석",
              description: "몇 시간이 걸리던 IR 분석을 단 몇 분만에 완료합니다",
              color: "from-accent-orange to-accent-red",
            },
            {
              icon: <Shield className="w-8 h-8" />,
              title: "전문가 수준",
              description:
                "전문 AI 에이전트가 제공하는 전문 컨설턴트 수준의 분석 품질",
              color: "from-primary-500 to-accent-purple",
            },
            {
              icon: <TrendingUp className="w-8 h-8" />,
              title: "즉시 활용",
              description:
                "바로 활용 가능한 PDF 보고서로 투자 유치 성공률 향상",
              color: "from-accent-teal to-primary-500",
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="card-rounded p-8 text-center hover:scale-105 transition-transform duration-300"
            >
              <div
                className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 text-white`}
              >
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="card-rounded p-12 max-w-4xl mx-auto"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            {user
              ? "새로운 IR 분석을 시작하세요"
              : "지금 바로 IR 분석을 시작하세요"}
          </h2>
          <p className="text-xl text-gray-700 mb-8">
            {user
              ? "IR 자료를 업로드하고 AI 기반 분석 보고서를 받아보세요"
              : "무료 계정을 만들고 첫 번째 IR 자료를 분석해보세요"}
          </p>
          {user ? (
            <Link
              to="/upload"
              className="btn-primary btn-glow text-lg px-8 py-4 flex items-center justify-center"
            >
              분석 시작하기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          ) : (
            <Link
              to="/register"
              className="btn-primary btn-glow text-lg px-8 py-4"
            >
              무료 계정 만들기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          )}
        </motion.div>
      </section>
    </div>
  );
};

export default Home;
