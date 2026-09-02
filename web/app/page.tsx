import { ArrowRight, LockKeyhole, Map } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="login-grid absolute inset-0" aria-hidden="true" />
      <div
        className="absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -right-32 -top-28 h-96 w-96 rounded-full bg-lime-200/8 blur-3xl"
        aria-hidden="true"
      />

      <section className="relative z-10 flex min-h-dvh items-center justify-center px-5 py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-6 flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl border border-emerald-200/20 bg-emerald-200/10 text-[15px] font-black tracking-[-0.04em] text-emerald-200">
                LX
              </span>
              <div>
                <p className="text-sm font-semibold tracking-tight text-white">
                  농지 공간정보
                </p>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/38">
                  Farmland survey
                </p>
              </div>
            </div>
            <Map className="size-5 text-emerald-200/45" aria-hidden="true" />
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#0c1714]/88 p-7 shadow-[0_30px_90px_rgba(0,0,0,0.46)] backdrop-blur-xl sm:p-9">
            <div className="mb-8 grid size-12 place-items-center rounded-2xl border border-emerald-200/15 bg-emerald-200/8 text-emerald-200">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/70">
              Restricted access
            </p>
            <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.035em] text-white">
              농지 경계 열람
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/52">
              항공사진과 농지 경계가 중첩된 공간정보입니다.
              <br />
              열람 암호를 입력해 주세요.
            </p>

            <form className="mt-8 space-y-5" method="post">
              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-xs text-white/70">
                  열람 암호
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="암호를 입력하세요"
                  className="h-12 rounded-xl border-white/12 bg-white/[0.055] px-4 text-white placeholder:text-white/25 focus-visible:border-emerald-200/60 focus-visible:ring-emerald-200/15"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-emerald-200 text-[#082018] shadow-[0_12px_30px_rgba(167,243,208,0.13)] hover:bg-emerald-100"
              >
                열람 시작
                <ArrowRight className="ml-1 size-4" aria-hidden="true" />
              </Button>
            </form>

            <p className="mt-6 text-center text-[11px] leading-5 text-white/30">
              승인된 사용자만 이용할 수 있습니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
