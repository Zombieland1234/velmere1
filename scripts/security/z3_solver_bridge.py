import sys
import json
import time
import z3

def run_smt(smt_code: str, timeout_ms: int = 5000) -> dict:
    t0 = time.time()
    solver = z3.Solver()
    solver.set("timeout", timeout_ms)
    
    try:
        solver.from_string(smt_code)
    except Exception as e:
        return {
            "status": "UNKNOWN",
            "rawSolverOutput": "error",
            "durationMs": int((time.time() - t0) * 1000),
            "error": str(e)
        }
        
    check_res = solver.check()
    duration_ms = int((time.time() - t0) * 1000)
    
    if check_res == z3.unsat:
        # Counterexample does NOT exist -> Invariant is PROVEN
        return {
            "status": "PROVEN",
            "rawSolverOutput": "unsat",
            "durationMs": duration_ms
        }
    elif check_res == z3.sat:
        # Counterexample exists -> Invariant is DISPROVEN
        model = solver.model()
        counterexample = {}
        for d in model.decls():
            counterexample[d.name()] = str(model[d])
        return {
            "status": "DISPROVEN",
            "rawSolverOutput": "sat",
            "durationMs": duration_ms,
            "counterexample": counterexample
        }
    else:
        return {
            "status": "UNKNOWN",
            "rawSolverOutput": "unknown",
            "durationMs": duration_ms
        }

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--stdin":
        input_data = json.loads(sys.stdin.read())
        smt_code = input_data.get("smt", "")
        timeout_ms = input_data.get("timeoutMs", 5000)
        res = run_smt(smt_code, timeout_ms)
        print(json.dumps(res))
    else:
        # Quick self-test
        sample = """
        (set-logic QF_LIA)
        (declare-const x Int)
        (assert (> x 10))
        (assert (< x 5))
        (check-sat)
        """
        res = run_smt(sample)
        print("Self-test result:", json.dumps(res))
