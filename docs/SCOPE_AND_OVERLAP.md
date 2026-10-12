# WATBook scope and overlap audit

**Audit date:** 2026-10-12. This comparison was made against the linked repository chapter sources, not inferred from repository titles or READMEs alone. Upstream code and lessons remain independent publications. WATBook does not copy their prose, diagrams, or simulator implementations.

## Chapter-level overlap matrix

| Existing source | Observed coverage in source chapters | WATBook boundary |
| --- | --- | --- |
| [DeviceBook: transport](https://github.com/geniuskey/devicebook/blob/main/chapters/transport.html), [MS/TLM](https://github.com/geniuskey/devicebook/blob/main/chapters/ms.html), [MOSFET](https://github.com/geniuskey/devicebook/blob/main/chapters/mosfet.html), [MOS](https://github.com/geniuskey/devicebook/blob/main/chapters/mos.html), [diode](https://github.com/geniuskey/devicebook/blob/main/chapters/diode.html) | Semiconductor transport and resistivity, four-point probe/Hall, TLM/contact extraction, MOSFET Vth/SS, C–V, diode I–V, and breakdown. | Link for device-physics and extraction foundations. WATBook treats metric definitions, measurement conditions, structure context, extraction governance, uncertainty, and what a wafer result can support. The MOS curve exercise is limited to comparing two declared extraction conventions; device theory remains in DeviceBook. |
| [ProcessBook: wafer](https://github.com/geniuskey/processbook/blob/main/chapters/wafer.html), [metrology](https://github.com/geniuskey/processbook/blob/main/chapters/metrology.html) | Scribe/monitor structures, resistivity/Irvin context, film metrology, SPC/Cpk, and defect/yield discussion. | Link for process modules and introductory monitor concepts. Focus on mapping monitor purpose to a specific electrical measurand, sampled population, measurement recipe, and engineering decision. |
| [TCADBook: MOSFET](https://github.com/geniuskey/tcadbook/blob/main/chapters/mosfet.html), [calibration](https://github.com/geniuskey/tcadbook/blob/main/chapters/calibration.html), [variability](https://github.com/geniuskey/tcadbook/blob/main/chapters/variability.html) | Constant-current/max-gm Vth comparison, model fitting/identifiability, and statistical device variability. | Link for simulation physics, calibration, and device variability. Distinguish measured structures and extraction conventions from TCAD parameters; a WAT curve is not a calibrated compact model. |
| [YieldBook: wafer](https://github.com/geniuskey/yieldbook/blob/main/chapters/wafer.html), [sort](https://github.com/geniuskey/yieldbook/blob/main/chapters/sort.html), [patterns](https://github.com/geniuskey/yieldbook/blob/main/chapters/patterns.html), [statistics](https://github.com/geniuskey/yieldbook/blob/main/chapters/statistics.html) | Coordinate systems, wafer maps/spatial statistics, SPC, sampling, and probe-related artifacts. | Link for general mapping/statistics. WATBook focuses on coordinate provenance and confounding: test/prober coordinates may not equal assembly/substrate-map coordinates, and equipment/channel/sequence effects can mimic spatial process structure. |
| [TestBook: interface](https://github.com/geniuskey/testbook/blob/main/chapters/interface.html), [DC](https://github.com/geniuskey/testbook/blob/main/chapters/dc.html), [limits](https://github.com/geniuskey/testbook/blob/main/chapters/limits.html) | Prober/contact/scrub/settling, DC methods, gauge R&R, guardbands, and capability indices. | Link for general test-system practice. WATBook carries those dependencies into an electrical monitor's measurement contract and uncertainty argument, without duplicating a general test chapter. |
| [FailureBook: test](https://github.com/geniuskey/failurebook/blob/main/chapters/test.html) | Electrical signatures, wafer-map patterns, localization, and failure-analysis workflow. | Link for downstream FA methods. WATBook ends at ranked, falsifiable process/device hypotheses and follow-up measurements; it does not claim root cause from a parametric signature. |
| [PMICBook: metrology](https://github.com/frbread7/pmicbook/blob/main/chapters/metrology.html) | PMIC production-test overview, a test matrix, WAT/EDS terminology, SPC/Cpk, yield, and related product context. | Link for the BCD/PMIC case. WATBook generalizes wafer-level measurement strategy and inference limits across structures and technologies; PMIC-specific tests remain in PMICBook. |

The reference collection also includes Device, Digital, Design, Analog, SoC, Process, Litho, Etch, Doping, TCAD, Yield, Failure, Test, Packaging, Memory, Sensor, Display, Optics, and Chip Industry books, plus planned Power/GPU titles. See the My Library [roadmap](https://github.com/frbread7/books/blob/main/docs/ROADMAP.md). These are attributed as separate upstream/reference works, never as WATBook or My Library publications.

## WATBook's unique learning objective

The organizing unit is a **measurement-to-decision chain**:

1. Name the engineering decision and the uncertainty it can tolerate.
2. Specify the monitor structure, measurand, conditions, extraction rule, and sampled population.
3. Separate device/process variation from instrument, contact, temperature, coordinate, and data-pipeline effects.
4. Report the result with its method/version and uncertainty, then state what evidence would disconfirm the leading interpretation.
5. Relate wafer measurements to downstream product tests only with a documented population, split, validation design, and limitations.

WAT (wafer acceptance test), PCM (process control monitoring), in-line metrology, electrical die sort (EDS, often called wafer sort), and final test are not interchangeable names. The exact data hand-off varies by organization; WATBook defines its terms and does not claim one universal foundry flow. Statistical process control chart design is linked to YieldBook and the proposed FabControlBook; this book focuses on how existing control evidence is interpreted for parametric decisions.

## Source and reuse boundary

The inspected upstream book projects publish educational content under CC BY 4.0 and code under MIT; PMICBook also records its ProcessBook derivative attribution. License terms were checked at each source repository's root license files. WATBook uses original prose, examples, tests, SVGs, and simulator code and links to upstream lessons rather than adapting their material. Citations do not grant permission to reproduce protected content. SEMI E142 is referenced only to explain coordinate-system interoperability concerns; no standards text or tables are reproduced.
