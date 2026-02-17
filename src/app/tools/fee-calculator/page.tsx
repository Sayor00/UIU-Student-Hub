"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  GraduationCap,
  Calculator,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Receipt,
  Percent,
  CreditCard,
  Banknote,
  ExternalLink,
  Search,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  PROGRAMS,
  FIXED_FEES,
  WAIVER_PRESETS,
  calculateTermFee,
  calculateInstallments,
  calculateTotalProgramCost,
  calculateRetakeFee,
  formatTaka,
  type ProgramInfo,
} from "@/lib/feeData";

// ─── Searchable Program Selector ──────────────────────────────
function ProgramSelector({
  value,
  onSelect,
  showShortName = false,
}: {
  value: ProgramInfo | null;
  onSelect: (program: ProgramInfo | null) => void;
  showShortName?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  // Group programs
  const ugPrograms = PROGRAMS.filter((p) => p.level === "undergraduate");
  const gradPrograms = PROGRAMS.filter((p) => p.level === "graduate");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm font-normal"
        >
          <span className="truncate">
            {value
              ? showShortName
                ? `${value.name} (${value.shortName})`
                : value.name
              : "Select your program..."}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search program..." />
          <CommandList>
            <CommandEmpty>No program found.</CommandEmpty>
            <CommandGroup heading="Undergraduate">
              {ugPrograms.map((program) => (
                <CommandItem
                  key={program.shortName}
                  value={program.name} // Search by name
                  onSelect={() => {
                    onSelect(program);
                    setOpen(false);
                  }}
                  className="text-xs sm:text-sm"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.shortName === program.shortName ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {program.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Graduate">
              {gradPrograms.map((program) => (
                <CommandItem
                  key={program.shortName}
                  value={program.name}
                  onSelect={() => {
                    onSelect(program);
                    setOpen(false);
                  }}
                  className="text-xs sm:text-sm"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.shortName === program.shortName ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {program.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Fee Policy Info Component ─────────────────────────────────
function FeePolicyInfo() {
  const [open, setOpen] = React.useState(false);

  return (
    <Card className="border-dashed">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          <span className="text-xs sm:text-sm font-medium">UIU Fee Policy & Important Notes</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4">
              <Separator />
              {/* Fixed Fees */}
              <div>
                <h4 className="text-xs sm:text-sm font-semibold mb-2">Fixed Fees (Included in Total)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-sm">
                  <div className="flex justify-between bg-muted/50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                    <span>Admission Fee</span>
                    <span className="font-medium">{formatTaka(FIXED_FEES.admissionFee)}</span>
                  </div>
                  <div className="flex justify-between bg-muted/50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                    <span>Caution Money</span>
                    <span className="font-medium">{formatTaka(FIXED_FEES.cautionMoney)}</span>
                  </div>
                  <div className="flex justify-between bg-muted/50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                    <span>Per Trimester Fee</span>
                    <span className="font-medium">{formatTaka(FIXED_FEES.trimesterFee)}</span>
                  </div>
                  <div className="flex justify-between bg-muted/50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                    <span>Per Semester Fee</span>
                    <span className="font-medium">{formatTaka(FIXED_FEES.semesterFee)}</span>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div>
                <h4 className="text-xs sm:text-sm font-semibold mb-2">Important Notes</h4>
                <ul className="text-[11px] sm:text-sm text-muted-foreground space-y-1 list-disc pl-3 sm:pl-4">
                  <li>Waiver/Scholarship applies to <strong>tuition fee only</strong> (Credits × Per Credit Fee).</li>
                  <li>Trimester fee, lab fee, admission fee are <strong>not waivable</strong>.</li>
                  <li>First retake/repeat gets <strong>50% course fee waiver</strong>.</li>
                  <li>Waiver not applicable for Thesis/Project/Internship/Retake courses.</li>
                  <li>Students can avail <strong>only the best one</strong> from scholarships and waivers.</li>
                  <li>BSBGE: Lab Fee {formatTaka(2000)}/tri • B.Pharm: Lab Fee {formatTaka(5000)}/sem.</li>
                  <li>BA English & BSSMSJ have 15% discounted rate ({formatTaka(5525)}/cr).</li>
                </ul>
              </div>

              {/* Source Links */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
                <a href="https://www.uiu.ac.bd/admission/tuition-fees-payment-policies/tuition-fees-waiver/" target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="text-[10px] sm:text-xs gap-1 cursor-pointer hover:bg-muted">
                    <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Fees & Waivers
                  </Badge>
                </a>
                <a href="https://www.uiu.ac.bd/admission/tuition-fees-payment-policies/scholarship-tuition-fee-and-other-fees-waiver-policy/" target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="text-[10px] sm:text-xs gap-1 cursor-pointer hover:bg-muted">
                    <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Scholarship
                  </Badge>
                </a>
                <a href="https://www.uiu.ac.bd/admission/tuition-fees-payment-policies/" target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="text-[10px] sm:text-xs gap-1 cursor-pointer hover:bg-muted">
                    <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Payment Policies
                  </Badge>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Result Row Component ──────────────────────────────────────
function ResultRow({ label, value, highlight, sub, bold }: { label: string; value: string; highlight?: boolean; sub?: boolean; bold?: boolean }) {
  return (
    <div className={`flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 py-2 ${sub ? "pl-3 sm:pl-4 text-[11px] sm:text-sm text-muted-foreground" : "text-xs sm:text-sm"} ${highlight ? "bg-primary/5 -mx-2 sm:-mx-3 px-2 sm:px-3 rounded-lg" : ""}`}>
      <span className={`${bold ? "font-semibold" : ""} min-w-0`}>{label}</span>
      <span className={`font-mono whitespace-nowrap ${bold ? "font-bold text-sm sm:text-base" : "font-medium"} ${highlight ? "text-primary" : ""}`}>
        {value}
      </span>
    </div>
  );
}

// ─── Trimester Fee Calculator Tab ──────────────────────────────
function TrimesterFeeCalculator() {
  const [selectedProgram, setSelectedProgram] = React.useState<ProgramInfo | null>(null);
  const [credits, setCredits] = React.useState<string>("");
  const [waiverPreset, setWaiverPreset] = React.useState("none");
  const [customWaiver, setCustomWaiver] = React.useState<string>("");
  const [isCustomFeeEnabled, setIsCustomFeeEnabled] = React.useState(false);
  const [customCreditFee, setCustomCreditFee] = React.useState<string>("");
  const [customTermFee, setCustomTermFee] = React.useState<string>("");
  const [includeUpfront, setIncludeUpfront] = React.useState(false);
  const [result, setResult] = React.useState<ReturnType<typeof calculateTermFee> | null>(null);
  const [installments, setInstallments] = React.useState<ReturnType<typeof calculateInstallments> | null>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);

  const waiverPercentage = waiverPreset === "custom" ? (parseFloat(customWaiver) || 0) : (WAIVER_PRESETS.find(w => w.id === waiverPreset)?.percentage ?? 0);

  const handleCalculate = () => {
    if (!selectedProgram && !isCustomFeeEnabled) {
      toast.error("Please select a program or enable custom fee.");
      return;
    }
    const creditNum = parseFloat(credits);
    if (isNaN(creditNum) || creditNum <= 0) {
      toast.error("Please enter valid credit hours.");
      return;
    }
    if (creditNum > 25) {
      toast.error("Credit hours per term typically don't exceed 25.");
      return;
    }
    if (waiverPercentage < 0 || waiverPercentage > 100) {
      toast.error("Waiver percentage must be between 0 and 100.");
      return;
    }

    let effectivePerCreditFee = selectedProgram?.perCreditFee ?? 0;
    let effectiveTermFee: number | undefined;

    if (isCustomFeeEnabled) {
      const customFee = parseFloat(customCreditFee);
      if (isNaN(customFee) || customFee < 0) {
        toast.error("Please enter a valid custom credit fee.");
        return;
      }
      effectivePerCreditFee = customFee;

      if (customTermFee) {
        const termFee = parseFloat(customTermFee);
        if (isNaN(termFee) || termFee < 0) {
          toast.error("Please enter a valid custom term fee.");
          return;
        }
        effectiveTermFee = termFee;
      }
    }

    const termType = selectedProgram?.termType ?? "trimester";
    const labFee = selectedProgram?.labFeePerTerm ?? 0;

    const feeResult = calculateTermFee(
      creditNum,
      effectivePerCreditFee,
      waiverPercentage,
      termType,
      labFee,
      effectiveTermFee
    );
    const installmentResult = calculateInstallments(feeResult.totalFee, termType);

    setResult(feeResult);
    setInstallments(installmentResult);
    toast.success("Fee calculated!");

    // Scroll to result after a brief delay to allow rendering
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleReset = () => {
    setSelectedProgram(null);
    setCredits("");
    setWaiverPreset("none");
    setCustomWaiver("");
    setIsCustomFeeEnabled(false);
    setCustomCreditFee("");
    setCustomTermFee("");
    setIncludeUpfront(false);
    setResult(null);
    setInstallments(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Per Trimester/Semester Fee
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Calculate how much you&apos;ll pay for a specific trimester or semester based on the credits you&apos;re taking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Program Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Program</Label>
            <ProgramSelector
              value={selectedProgram}
              onSelect={(prog) => {
                setSelectedProgram(prog);
                setResult(null);
                setInstallments(null);
              }}
              showShortName
            />
            {selectedProgram && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">
                  {formatTaka(selectedProgram.perCreditFee)}/credit
                </Badge>
                <Badge variant="secondary">
                  {selectedProgram.termType === "semester" ? "Semester-based" : "Trimester-based"}
                </Badge>
                {selectedProgram.labFeePerTerm > 0 && (
                  <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
                    Lab Fee: {formatTaka(selectedProgram.labFeePerTerm)}/{selectedProgram.termType}
                  </Badge>
                )}
                {selectedProgram.perCreditFee < 6500 && (
                  <Badge variant="secondary" className="text-green-600 dark:text-green-400">
                    15% discounted rate
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Custom Fee Toggle */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="customFee"
                checked={isCustomFeeEnabled}
                onChange={(e) => {
                  setIsCustomFeeEnabled(e.target.checked);
                  setResult(null);
                  setInstallments(null);
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="customFee" className="text-sm cursor-pointer">
                Manually input credit fee?
              </Label>
            </div>
            {isCustomFeeEnabled && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="customCreditFeeInput" className="text-xs text-muted-foreground">Credit Fee</Label>
                  <Input
                    id="customCreditFeeInput"
                    type="number"
                    placeholder="Fee per credit"
                    value={customCreditFee}
                    onChange={(e) => {
                      setCustomCreditFee(e.target.value);
                      setResult(null);
                      setInstallments(null);
                    }}
                    min={0}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customTermFeeInput" className="text-xs text-muted-foreground">Term Fee (Optional)</Label>
                  <Input
                    id="customTermFeeInput"
                    type="number"
                    placeholder="Sem/Tri fee"
                    value={customTermFee}
                    onChange={(e) => {
                      setCustomTermFee(e.target.value);
                      setResult(null);
                      setInstallments(null);
                    }}
                    min={0}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Credits */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Credits This Term</Label>
            <Input
              type="number"
              placeholder="e.g. 12"
              value={credits}
              onChange={(e) => {
                setCredits(e.target.value);
                setResult(null);
                setInstallments(null);
              }}
              min={1}
              max={25}
            />
          </div>

          {/* Waiver */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tuition Fee Waiver</Label>
            <Select
              value={waiverPreset}
              onValueChange={(val) => {
                setWaiverPreset(val);
                setResult(null);
                setInstallments(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select waiver type" />
              </SelectTrigger>
              <SelectContent>
                {WAIVER_PRESETS.filter(
                  (w) => w.applicableTo === "both" || w.applicableTo === selectedProgram?.level || !selectedProgram
                ).map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {waiverPreset === "custom" && (
              <Input
                type="number"
                placeholder="Enter waiver percentage (0-100)"
                value={customWaiver}
                onChange={(e) => {
                  setCustomWaiver(e.target.value);
                  setResult(null);
                  setInstallments(null);
                }}
                min={0}
                max={100}
              />
            )}
          </div>

          {/* Fresher Toggle */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Student Status</Label>
            <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg border">
              <input
                type="checkbox"
                id="includeUpfront"
                checked={includeUpfront}
                onChange={(e) => {
                  setIncludeUpfront(e.target.checked);
                  setResult(null);
                  setInstallments(null);
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="includeUpfront" className="text-sm cursor-pointer">
                I am a fresher (first trimester/semester student)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-1">
              Freshers must pay ৳20,000 before registration. Continuing students pay in regular installments only.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleCalculate} className="flex-1 gap-2">
              <Calculator className="h-4 w-4" />
              Calculate
            </Button>
            <Button onClick={handleReset} variant="outline" size="icon">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  Fee Breakdown
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {selectedProgram?.shortName} • {credits} credits • {waiverPercentage}% waiver
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <ResultRow label={`Tuition Fee (${credits} × ${formatTaka(isCustomFeeEnabled && customCreditFee ? parseFloat(customCreditFee) : (selectedProgram?.perCreditFee ?? 0))})`} value={formatTaka(result.tuitionFee)} />
                {result.waiverAmount > 0 && (
                  <ResultRow label={`Waiver (${waiverPercentage}%)`} value={`- ${formatTaka(result.waiverAmount)}`} sub />
                )}
                <ResultRow label={`${selectedProgram?.termType === "semester" ? "Semester" : "Trimester"} Fee`} value={formatTaka(result.termFee)} />
                {result.labFee > 0 && (
                  <ResultRow label="Lab Fee" value={formatTaka(result.labFee)} />
                )}
                <Separator className="my-2" />
                <ResultRow label="Total Payable" value={formatTaka(result.totalFee)} highlight bold />

                {/* Installments */}
                {installments && (
                  <>
                    <Separator className="my-3" />
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Installment Breakdown
                    </h4>
                    {includeUpfront ? (
                      <>
                        <ResultRow label="Upfront Payment (before registration)" value={formatTaka(installments.upfront)} />
                        {installments.installments.map((amt, i) => (
                          <ResultRow
                            key={i}
                            label={installments.installmentLabels[i]}
                            value={formatTaka(amt)}
                            sub
                          />
                        ))}
                      </>
                    ) : (
                      <>
                        {selectedProgram?.termType === "semester" ? (
                          <>
                            <ResultRow label="1st Installment (25%)" value={formatTaka(result.totalFee * 0.25)} sub />
                            <ResultRow label="2nd Installment (25%)" value={formatTaka(result.totalFee * 0.25)} sub />
                            <ResultRow label="3rd Installment (25%)" value={formatTaka(result.totalFee * 0.25)} sub />
                            <ResultRow label="4th Installment (25%)" value={formatTaka(result.totalFee * 0.25)} sub />
                          </>
                        ) : (
                          <>
                            <ResultRow label="1st Installment (40%)" value={formatTaka(result.totalFee * 0.4)} sub />
                            <ResultRow label="2nd Installment (30%)" value={formatTaka(result.totalFee * 0.3)} sub />
                            <ResultRow label="3rd Installment (30%)" value={formatTaka(result.totalFee * 0.3)} sub />
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Total Program Cost Estimator Tab ──────────────────────────
function TotalCostEstimator() {
  const [selectedProgram, setSelectedProgram] = React.useState<ProgramInfo | null>(null);
  const [selectedVariant, setSelectedVariant] = React.useState<string>("");
  const [waiverPreset, setWaiverPreset] = React.useState("none");
  const [customWaiver, setCustomWaiver] = React.useState<string>("");
  const [isCustomFeeEnabled, setIsCustomFeeEnabled] = React.useState(false);
  const [customCreditFee, setCustomCreditFee] = React.useState<string>("");
  const [customTermFee, setCustomTermFee] = React.useState<string>("");
  const [result, setResult] = React.useState<ReturnType<typeof calculateTotalProgramCost> | null>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);

  const waiverPercentage = waiverPreset === "custom" ? (parseFloat(customWaiver) || 0) : (WAIVER_PRESETS.find(w => w.id === waiverPreset)?.percentage ?? 0);

  const effectiveCredits = React.useMemo(() => {
    if (!selectedProgram) return 0;
    if (selectedProgram.hasVariants && selectedVariant) {
      const variant = selectedProgram.variants?.find(v => v.name === selectedVariant);
      return variant?.credits ?? selectedProgram.totalCredits;
    }
    return selectedProgram.totalCredits;
  }, [selectedProgram, selectedVariant]);

  const handleCalculate = () => {
    if (!selectedProgram) {
      toast.error("Please select a program.");
      return;
    }
    if (waiverPercentage < 0 || waiverPercentage > 100) {
      toast.error("Waiver percentage must be between 0 and 100.");
      return;
    }

    if (waiverPercentage < 0 || waiverPercentage > 100) {
      toast.error("Waiver percentage must be between 0 and 100.");
      return;
    }

    let programToCalculate = selectedProgram;
    let manualTermFee: number | undefined;

    if (isCustomFeeEnabled) {
      const customFee = parseFloat(customCreditFee);
      if (isNaN(customFee) || customFee < 0) {
        toast.error("Please enter a valid custom credit fee.");
        return;
      }
      programToCalculate = { ...selectedProgram, perCreditFee: customFee };

      if (customTermFee) {
        const termFee = parseFloat(customTermFee);
        if (isNaN(termFee) || termFee < 0) {
          toast.error("Please enter a valid custom term fee.");
          return;
        }
        manualTermFee = termFee;
      }
    }

    const costResult = calculateTotalProgramCost(programToCalculate, waiverPercentage, effectiveCredits, manualTermFee);
    setResult(costResult);
    toast.success("Total cost estimated!");

    // Scroll to result
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleReset = () => {
    setSelectedProgram(null);
    setSelectedVariant("");
    setWaiverPreset("none");
    setCustomWaiver("");
    setIsCustomFeeEnabled(false);
    setCustomCreditFee("");
    setCustomTermFee("");
    setResult(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Total Program Cost Estimate
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Estimate the total cost of your entire degree program including all fees.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Program Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Program</Label>
            <ProgramSelector
              value={selectedProgram}
              onSelect={(prog) => {
                setSelectedProgram(prog);
                setSelectedVariant("");
                setResult(null);
              }}
            />
            {selectedProgram && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{effectiveCredits} credits</Badge>
                <Badge variant="secondary">{selectedProgram.totalTerms} {selectedProgram.termType}s</Badge>
                <Badge variant="secondary">{formatTaka(selectedProgram.perCreditFee)}/credit</Badge>
                {selectedProgram.labFeePerTerm > 0 && (
                  <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
                    +{formatTaka(selectedProgram.labFeePerTerm)} lab/{selectedProgram.termType}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Variant Selection (for graduate programs) */}
          {selectedProgram?.hasVariants && selectedProgram.variants && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Program Variant</Label>
              <Select
                value={selectedVariant}
                onValueChange={(val) => {
                  setSelectedVariant(val);
                  setResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select variant" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProgram.variants.map((v) => (
                    <SelectItem key={v.name} value={v.name}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Fee Toggle */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="totalCustomFee"
                checked={isCustomFeeEnabled}
                onChange={(e) => {
                  setIsCustomFeeEnabled(e.target.checked);
                  setResult(null);
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="totalCustomFee" className="text-sm cursor-pointer">
                Manually input credit fee?
              </Label>
            </div>
            {isCustomFeeEnabled && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="totalCustomCreditFee" className="text-xs text-muted-foreground">Credit Fee</Label>
                  <Input
                    id="totalCustomCreditFee"
                    type="number"
                    placeholder="Fee per credit"
                    value={customCreditFee}
                    onChange={(e) => {
                      setCustomCreditFee(e.target.value);
                      setResult(null);
                    }}
                    min={0}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="totalCustomTermFee" className="text-xs text-muted-foreground">Term Fee (Optional)</Label>
                  <Input
                    id="totalCustomTermFee"
                    type="number"
                    placeholder="Sem/Tri fee"
                    value={customTermFee}
                    onChange={(e) => {
                      setCustomTermFee(e.target.value);
                      setResult(null);
                    }}
                    min={0}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Waiver */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tuition Fee Waiver</Label>
            <Select
              value={waiverPreset}
              onValueChange={(val) => {
                setWaiverPreset(val);
                setResult(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select waiver type" />
              </SelectTrigger>
              <SelectContent>
                {WAIVER_PRESETS.filter(
                  (w) => w.applicableTo === "both" || w.applicableTo === selectedProgram?.level || !selectedProgram
                ).map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {waiverPreset === "custom" && (
              <Input
                type="number"
                placeholder="Enter waiver percentage (0-100)"
                value={customWaiver}
                onChange={(e) => {
                  setCustomWaiver(e.target.value);
                  setResult(null);
                }}
                min={0}
                max={100}
              />
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleCalculate} className="flex-1 gap-2">
              <Calculator className="h-4 w-4" />
              Estimate Total Cost
            </Button>
            <Button onClick={handleReset} variant="outline" size="icon">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  Total Program Cost
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {selectedProgram?.name} {selectedVariant ? `(${selectedVariant})` : ""} • {effectiveCredits} credits • {waiverPercentage}% waiver
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <ResultRow label={`Total Tuition (${effectiveCredits} credits × ${formatTaka(isCustomFeeEnabled && customCreditFee ? parseFloat(customCreditFee) : (selectedProgram?.perCreditFee ?? 0))})`} value={formatTaka(result.totalTuition)} />
                {result.totalWaiver > 0 && (
                  <ResultRow label={`Tuition Waiver (${waiverPercentage}%)`} value={`- ${formatTaka(result.totalWaiver)}`} sub />
                )}
                <ResultRow
                  label={`${selectedProgram?.termType === "semester" ? "Semester" : "Trimester"} Fees (${selectedProgram?.totalTerms} × ${formatTaka(selectedProgram?.termType === "semester" ? FIXED_FEES.semesterFee : FIXED_FEES.trimesterFee)})`}
                  value={formatTaka(result.totalTermFees)}
                />
                {result.totalLabFees > 0 && (
                  <ResultRow
                    label={`Lab Fees (${selectedProgram?.totalTerms} × ${formatTaka(selectedProgram?.labFeePerTerm ?? 0)})`}
                    value={formatTaka(result.totalLabFees)}
                  />
                )}
                <ResultRow label="Admission Fee (non-refundable)" value={formatTaka(result.admissionFee)} />
                <ResultRow label="Caution Money (refundable)" value={formatTaka(result.cautionMoney)} sub />
                <Separator className="my-2" />
                <ResultRow label="Estimated Grand Total" value={formatTaka(result.grandTotal)} highlight bold />

                {/* Per-Term Average */}
                {selectedProgram && (
                  <>
                    <Separator className="my-3" />
                    <h4 className="text-sm font-semibold mb-2">Average Per {selectedProgram.termType === "semester" ? "Semester" : "Trimester"}</h4>
                    <ResultRow
                      label={`≈ per ${selectedProgram.termType} (excluding one-time fees)`}
                      value={formatTaka(
                        (result.grandTotal - result.admissionFee - result.cautionMoney) / selectedProgram.totalTerms
                      )}
                      sub
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Retake Fee Calculator Tab ─────────────────────────────────
function RetakeFeeCalculator() {
  const [selectedProgram, setSelectedProgram] = React.useState<ProgramInfo | null>(null);
  const [credits, setCredits] = React.useState<string>("");
  const [isFirstRetake, setIsFirstRetake] = React.useState<string>("yes");
  const [numCourses, setNumCourses] = React.useState<string>("1");
  const [isCustomFeeEnabled, setIsCustomFeeEnabled] = React.useState(false);
  const [customCreditFee, setCustomCreditFee] = React.useState<string>("");
  const resultRef = React.useRef<HTMLDivElement>(null);
  const [result, setResult] = React.useState<ReturnType<typeof calculateRetakeFee> | null>(null);

  const handleCalculate = () => {
    if (!selectedProgram && !isCustomFeeEnabled) {
      toast.error("Please select a program or enable custom fee.");
      return;
    }
    const creditNum = parseFloat(credits);
    if (isNaN(creditNum) || creditNum <= 0) {
      toast.error("Please enter valid credit hours.");
      return;
    }

    let perCreditFee = selectedProgram?.perCreditFee ?? 0;
    if (isCustomFeeEnabled) {
      const customFee = parseFloat(customCreditFee);
      if (isNaN(customFee) || customFee < 0) {
        toast.error("Please enter a valid custom credit fee.");
        return;
      }
      perCreditFee = customFee;
    }

    const retakeResult = calculateRetakeFee(
      creditNum,
      perCreditFee,
      isFirstRetake === "yes"
    );
    setResult(retakeResult);

    // Scroll to result
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    toast.success("Retake fee calculated!");
  };

  const handleReset = () => {
    setSelectedProgram(null);
    setCredits("");
    setIsFirstRetake("yes");
    setNumCourses("1");
    setIsCustomFeeEnabled(false);
    setCustomCreditFee("");
    setResult(null);
  };

  const coursesCount = parseInt(numCourses) || 1;

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Retake Course Fee
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Calculate the cost of retaking a course. First retake gets 50% fee waiver.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Program */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Program</Label>
            <ProgramSelector
              value={selectedProgram}
              onSelect={(prog) => {
                setSelectedProgram(prog);
                setResult(null);
              }}
              showShortName
            />
          </div>

          {/* Custom Fee Toggle */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="retakeCustomFee"
                checked={isCustomFeeEnabled}
                onChange={(e) => {
                  setIsCustomFeeEnabled(e.target.checked);
                  setResult(null);
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="retakeCustomFee" className="text-sm cursor-pointer">
                Manually input credit fee?
              </Label>
            </div>
            {isCustomFeeEnabled && (
              <Input
                type="number"
                placeholder="Enter fee per credit"
                value={customCreditFee}
                onChange={(e) => {
                  setCustomCreditFee(e.target.value);
                  setResult(null);
                }}
                min={0}
              />
            )}
          </div>

          {/* Credits per course */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Credits per Course</Label>
            <Input
              type="number"
              placeholder="e.g. 3"
              value={credits}
              onChange={(e) => {
                setCredits(e.target.value);
                setResult(null);
              }}
              min={1}
              max={6}
            />
          </div>

          {/* Number of Retake Courses */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Number of Courses</Label>
            <Input
              type="number"
              placeholder="e.g. 1"
              value={numCourses}
              onChange={(e) => {
                setNumCourses(e.target.value);
                setResult(null);
              }}
              min={1}
              max={10}
            />
          </div>

          {/* First Retake? */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Is this the first retake?</Label>
            <Select
              value={isFirstRetake}
              onValueChange={(val) => {
                setIsFirstRetake(val);
                setResult(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes — First Retake (50% waiver)</SelectItem>
                <SelectItem value="no">No — Subsequent Retake (full price)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleCalculate} className="flex-1 gap-2">
              <Calculator className="h-4 w-4" />
              Calculate
            </Button>
            <Button onClick={handleReset} variant="outline" size="icon">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  Retake Fee Breakdown
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {coursesCount} course{coursesCount > 1 ? "s" : ""} × {credits} credit{parseFloat(credits) > 1 ? "s" : ""} • {isFirstRetake === "yes" ? "First retake (50% off)" : "Subsequent retake"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <ResultRow
                  label={`Course Fee (${credits} × ${formatTaka(isCustomFeeEnabled && customCreditFee ? parseFloat(customCreditFee) : (selectedProgram?.perCreditFee ?? 0))})`}
                  value={formatTaka(result.originalFee)}
                />
                {result.waiverAmount > 0 && (
                  <ResultRow label="First Retake Waiver (50%)" value={`- ${formatTaka(result.waiverAmount)}`} sub />
                )}
                <ResultRow label="Fee per Course" value={formatTaka(result.finalFee)} />
                {coursesCount > 1 && (
                  <>
                    <Separator className="my-2" />
                    <ResultRow
                      label={`Total for ${coursesCount} Courses`}
                      value={formatTaka(result.finalFee * coursesCount)}
                      highlight
                      bold
                    />
                  </>
                )}
                {coursesCount === 1 && (
                  <>
                    <Separator className="my-2" />
                    <ResultRow label="Total Retake Fee" value={formatTaka(result.finalFee)} highlight bold />
                  </>
                )}

                {/* Savings info */}
                {result.waiverAmount > 0 && (
                  <div className="mt-3 px-3 py-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      You save {formatTaka(result.waiverAmount * coursesCount)} with the first retake waiver!
                    </p>
                  </div>
                )}

                {isFirstRetake === "no" && (
                  <div className="mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      The 50% retake waiver applies only to the first retake of a course.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Waiver Comparison Tab ─────────────────────────────────────
function WaiverComparison() {
  const [selectedProgram, setSelectedProgram] = React.useState<ProgramInfo | null>(null);
  const [selectedVariant, setSelectedVariant] = React.useState<string>("");
  const [isCustomFeeEnabled, setIsCustomFeeEnabled] = React.useState(false);
  const [customCreditFee, setCustomCreditFee] = React.useState<string>("");
  const [customTermFee, setCustomTermFee] = React.useState<string>("");

  const effectiveCredits = React.useMemo(() => {
    if (!selectedProgram) return 0;
    if (selectedProgram.hasVariants && selectedVariant) {
      const variant = selectedProgram.variants?.find(v => v.name === selectedVariant);
      return variant?.credits ?? selectedProgram.totalCredits;
    }
    return selectedProgram.totalCredits;
  }, [selectedProgram, selectedVariant]);

  const comparisons = React.useMemo(() => {
    if (!selectedProgram) return [];
    let programToUse = selectedProgram;
    let manualTermFee: number | undefined;

    if (isCustomFeeEnabled) {
      const customFee = parseFloat(customCreditFee);
      if (!isNaN(customFee) && customFee >= 0) {
        programToUse = { ...selectedProgram, perCreditFee: customFee };
      }

      const termFee = parseFloat(customTermFee);
      if (!isNaN(termFee) && termFee >= 0) {
        manualTermFee = termFee;
      }
    }

    const waiverLevels = programToUse.level === "graduate"
      ? [0, 25, 50, 100]
      : [0, 25, 50, 100];

    return waiverLevels.map((pct) => ({
      percentage: pct,
      ...calculateTotalProgramCost(programToUse, pct, effectiveCredits, manualTermFee),
    }));
  }, [selectedProgram, effectiveCredits, isCustomFeeEnabled, customCreditFee, customTermFee]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Waiver Comparison
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Compare total program costs at different waiver levels side by side.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Program Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Program</Label>
            <ProgramSelector
              value={selectedProgram}
              onSelect={(prog) => {
                setSelectedProgram(prog);
                setSelectedVariant("");
                setIsCustomFeeEnabled(false);
                setCustomCreditFee("");
                setCustomTermFee("");
              }}
            />
          </div>

          {/* Variant */}
          {selectedProgram?.hasVariants && selectedProgram.variants && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Program Variant</Label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger>
                  <SelectValue placeholder="Select variant" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProgram.variants.map((v) => (
                    <SelectItem key={v.name} value={v.name}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Fee Toggle */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="compareCustomFee"
                checked={isCustomFeeEnabled}
                onChange={(e) => {
                  setIsCustomFeeEnabled(e.target.checked);
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="compareCustomFee" className="text-sm cursor-pointer">
                Manually input credit fee?
              </Label>
            </div>
            {isCustomFeeEnabled && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="compareCustomCreditFee" className="text-xs text-muted-foreground">Credit Fee</Label>
                  <Input
                    id="compareCustomCreditFee"
                    type="number"
                    placeholder="Fee per credit"
                    value={customCreditFee}
                    onChange={(e) => {
                      setCustomCreditFee(e.target.value);
                    }}
                    min={0}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="compareCustomTermFee" className="text-xs text-muted-foreground">Term Fee (Optional)</Label>
                  <Input
                    id="compareCustomTermFee"
                    type="number"
                    placeholder="Sem/Tri fee"
                    value={customTermFee}
                    onChange={(e) => {
                      setCustomTermFee(e.target.value);
                    }}
                    min={0}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Cards */}
      {selectedProgram && comparisons.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {comparisons.map((comp, idx) => (
            <motion.div
              key={comp.percentage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className={`h-full ${comp.percentage === 0 ? "border-muted-foreground/30" : comp.percentage === 100 ? "border-green-500/50 bg-green-50/30 dark:bg-green-950/10" : "border-primary/20"}`}>
                <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
                  <div className="flex items-center justify-between gap-1">
                    <Badge
                      variant={comp.percentage === 0 ? "secondary" : "default"}
                      className={`text-[10px] sm:text-xs ${comp.percentage === 100 ? "bg-green-600" : ""}`}
                    >
                      {comp.percentage}%
                    </Badge>
                    {comp.percentage === 0 && (
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground">No waiver</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-2">
                  <div className="text-base sm:text-3xl font-bold font-mono text-primary break-all">
                    {formatTaka(comp.grandTotal)}
                  </div>
                  <div className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Tuition</span>
                      <span>{formatTaka(comp.totalTuition - comp.totalWaiver)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Term Fees</span>
                      <span>{formatTaka(comp.totalTermFees)}</span>
                    </div>
                    {comp.totalLabFees > 0 && (
                      <div className="flex justify-between">
                        <span>Lab Fees</span>
                        <span>{formatTaka(comp.totalLabFees)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>One-time Fees</span>
                      <span>{formatTaka(comp.admissionFee + comp.cautionMoney)}</span>
                    </div>
                  </div>
                  {comp.totalWaiver > 0 && (
                    <div className="pt-2 border-t">
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        You save {formatTaka(comp.totalWaiver)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────
const TABS = [
  { id: "trimester", label: "Per Term", icon: Receipt, shortLabel: "Per Term" },
  { id: "total", label: "Total Cost", icon: GraduationCap, shortLabel: "Total" },
  { id: "retake", label: "Retake Fee", icon: RotateCcw, shortLabel: "Retake" },
  { id: "compare", label: "Compare Waivers", icon: Percent, shortLabel: "Compare" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function FeeCalculatorPage() {
  const [activeTab, setActiveTab] = React.useState<TabId>("trimester");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl animate-pulse">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-6 sm:h-7 w-40 sm:w-52 rounded-md bg-muted" />
            <div className="h-4 w-full max-w-[320px] rounded-md bg-muted" />
          </div>
        </div>
        <div className="flex gap-1.5 sm:gap-2 mb-6 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 sm:h-9 w-20 sm:w-28 rounded-md bg-muted shrink-0" />
          ))}
        </div>
        <div className="h-[400px] rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 sm:gap-4 mb-6 sm:mb-8"
      >
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/20">
          <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold">UIU Fee Calculator</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Calculate tuition fees, program costs, retake fees, and compare waivers based on UIU&apos;s official fee structure.
          </p>
        </div>
      </motion.div>

      {/* Fee Policy Info */}
      <div className="mb-6">
        <FeePolicyInfo />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 -mx-3 sm:-mx-1 px-3 sm:px-1 scrollbar-none">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className={`gap-1 sm:gap-1.5 shrink-0 text-[11px] sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3 ${activeTab === tab.id ? "shadow-md" : ""
              }`}
          >
            <tab.icon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "trimester" && <TrimesterFeeCalculator />}
          {activeTab === "total" && <TotalCostEstimator />}
          {activeTab === "retake" && <RetakeFeeCalculator />}
          {activeTab === "compare" && <WaiverComparison />}
        </motion.div>
      </AnimatePresence>

      {/* Disclaimer */}
      <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-muted/50 rounded-lg border border-dashed text-[11px] sm:text-sm text-muted-foreground">
        <p className="flex items-start gap-2">
          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 shrink-0" />
          <span>
            <strong>Disclaimer:</strong> This calculator is for estimation purposes only, based on publicly available UIU fee data.
            Actual fees may vary. UIU reserves the right to change policies, fees, curricula, or any other matters without prior notice.
            Always confirm with the{" "}
            <a
              href="https://www.uiu.ac.bd/admission/tuition-fees-payment-policies/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              UIU Admissions Office
            </a>
            .
          </span>
        </p>
      </div>
    </div>
  );
}
