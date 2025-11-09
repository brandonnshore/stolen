import { Link } from 'react-router-dom';
import { Upload, Sparkles, Shirt, ArrowRight } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'The Upload',
      subtitle: 'Snap & Submit',
      description: 'See a design you love? Take a photo of any shirt, hoodie, or garment. Our system accepts anything—street fashion, vintage finds, concert merch, you name it.',
      icon: Upload,
      color: 'from-red-500 to-orange-500',
      tip: 'Pro tip: Better lighting = cleaner extraction'
    },
    {
      number: '02',
      title: 'The Extraction',
      subtitle: 'AI Does the Dirty Work',
      description: 'Our AI analyzes the image, isolates the design, removes the fabric, and recreates it at 300 DPI print quality. Strokes, shadows, gradients—every detail preserved.',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-500',
      tip: 'Sometimes it takes 2-3 tries for complex designs—we\'ll let you know if the AI needs another shot'
    },
    {
      number: '03',
      title: 'The Getaway',
      subtitle: 'Print & Ship',
      description: 'Adjust size, pick your blank, choose quantity. We print it on premium garments using DTG (Direct to Garment) and ship it to your door. No minimums, no questions asked.',
      icon: Shirt,
      color: 'from-blue-500 to-cyan-500',
      tip: 'Orders ship within 3-5 business days'
    }
  ];

  return (
    <div className="bg-white dark:bg-black min-h-screen transition-colors duration-300">
      {/* Hero Section */}
      <section className="relative bg-black dark:bg-white text-white dark:text-black py-20 sm:py-32 overflow-hidden transition-colors duration-300">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-block px-4 py-2 bg-red-600/20 border border-red-600 rounded-full text-red-400 text-sm font-medium mb-6">
            CLASSIFIED: How The Heist Works
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6">
            Steal any design.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-purple-400 to-blue-400">
              Keep all the credit.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Our AI-powered extraction technology lets you recreate any design you see in the wild. Here's how we pull it off.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-red-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl"></div>
      </section>

      {/* Steps Section */}
      <section className="py-20 sm:py-32 bg-white dark:bg-black transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="space-y-24">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}
                >
                  {/* Icon Side */}
                  <div className="flex-1 flex justify-center">
                    <div className="relative">
                      {/* Glowing background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-20 blur-3xl rounded-full transform scale-150`}></div>

                      {/* Icon container */}
                      <div className={`relative w-48 h-48 sm:w-64 sm:h-64 rounded-2xl bg-gradient-to-br ${step.color} p-1`}>
                        <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                          <Icon className="w-24 h-24 sm:w-32 sm:h-32 text-gray-900" strokeWidth={1.5} />
                        </div>
                      </div>

                      {/* Step number badge */}
                      <div className="absolute -top-4 -right-4 w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold border-4 border-white shadow-lg">
                        {step.number}
                      </div>
                    </div>
                  </div>

                  {/* Content Side */}
                  <div className="flex-1 max-w-xl">
                    <div className={`inline-block px-3 py-1 bg-gradient-to-r ${step.color} bg-opacity-10 rounded-full text-sm font-semibold mb-4`}>
                      {step.subtitle}
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
                      {step.title}
                    </h2>
                    <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                      {step.description}
                    </p>
                    <div className="bg-gray-50 border-l-4 border-gray-900 px-4 py-3 rounded">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">💡 {step.tip}</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Legal Disclaimer Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white border-2 border-gray-900 rounded-lg p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Legal Fine Print (We're Not Actually Criminals)</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  While we love the rebel aesthetic, we're legally obligated to remind you: <strong>respect intellectual property rights.</strong> This tool is designed for personal use, inspiration, and recreating your own designs—not for commercial reproduction of copyrighted or trademarked material.
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Our AI may alter brand names and logos due to copyright filters. If you're recreating someone else's work, make sure you have permission or that it falls under fair use. We're just the tech—you're responsible for how you use it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 bg-black dark:bg-white text-white dark:text-black relative overflow-hidden transition-colors duration-300">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-6">
            Ready to pull off<br/>your first heist?
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 mb-10">
            Upload a design and see the magic happen in seconds.
          </p>
          <Link
            to="/products/classic-tee"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white dark:bg-black text-black dark:text-white text-lg font-bold rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 border-2 border-transparent dark:border-gray-800 transition-all transform hover:scale-105"
          >
            Start Your Heist
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="absolute top-10 left-10 w-32 h-32 bg-red-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl"></div>
      </section>
    </div>
  );
}
