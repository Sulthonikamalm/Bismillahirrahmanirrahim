# 📄 Research Proposal: Temporal Intent Graph (TIG)

## Paper Title
**"Modeling Non-Linear Trauma Disclosure: A Temporal Graph Neural Network Approach for Crisis Chatbots"**

**Author:** Sulthonika Mahfudz Al Mujahidin  
**Institution:** Telkom University Surabaya  
**Target Venues:** EMNLP, ACL, AAAI (Top-tier NLP/AI Conferences)

---

## 📋 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Research Gap & Motivation](#2-research-gap--motivation)
3. [Novel Contributions](#3-novel-contributions)
4. [Theoretical Framework](#4-theoretical-framework)
5. [System Architecture](#5-system-architecture)
6. [Mathematical Formulation](#6-mathematical-formulation)
7. [Dataset Design](#7-dataset-design)
8. [Experimental Design](#8-experimental-design)
9. [Paper Structure](#9-paper-structure)
10. [Key Highlights to Emphasize](#10-key-highlights-to-emphasize)
11. [Boundaries & Limitations](#11-boundaries--limitations)
12. [Timeline](#12-timeline)
13. [Evaluation Metrics](#13-evaluation-metrics)
14. [Ethical Considerations](#14-ethical-considerations)

---

## 1. Executive Summary

### Problem Statement
Trauma survivors do not disclose experiences in a linear, predictable manner. They exhibit:
- **Retraction:** Pulling back after partial disclosure
- **Re-disclosure:** Returning to topic after discussing something else
- **Escalation:** Gradually revealing more severe details
- **Deflection:** Changing topic when becoming uncomfortable

Current NLP systems treat conversation as **sequential** (LSTM, Transformer), missing the **non-linear dynamics** of trauma disclosure.

### Proposed Solution
**Temporal Intent Graph (TIG)** - A graph-based neural network that models conversation as a dynamic graph where:
- Nodes represent utterances with multi-dimensional intent vectors
- Edges capture temporal, semantic, and emotional relationships
- Graph attention predicts disclosure trajectory

### Why This Matters
- First formal model for non-linear trauma disclosure
- Enables chatbots to anticipate user behavior (will they continue? retract?)
- Improves intervention timing and empathy calibration

---

## 2. Research Gap & Motivation

### 2.1 Literature Review Summary

| Existing Approach | Limitation |
|-------------------|------------|
| **BERT/RoBERTa for Intent** | Per-utterance classification, no conversation dynamics |
| **Dialogue State Tracking** | Assumes linear progression, task-oriented focus |
| **Emotional Trajectory Models** | Emotion only, not trauma-specific disclosure patterns |
| **Crisis Chatbots (Woebot, Wysa)** | Rule-based escalation, no predictive modeling |
| **Multi-turn Intent Detection** | Sequential models (LSTM/Transformer), not graph-based |

### 2.2 The Core Gap

```
CURRENT ASSUMPTION:
  Turn 1 → Turn 2 → Turn 3 → Turn 4 → ... (Linear)

REALITY OF TRAUMA DISCLOSURE:
  Turn 1 ──┐
           ├──→ Turn 3 (escalation)
  Turn 2 ──┘         │
                     ▼
              Turn 4 (retraction) ←── Turn 5 (return to Turn 2 topic)
                     │
                     ▼
              Turn 6 (re-disclosure with more detail)
```

**No existing model captures this non-linear, graph-like structure.**

### 2.3 Research Questions

1. **RQ1:** How can conversation be modeled as a temporal graph to capture non-linear disclosure patterns?
2. **RQ2:** What graph neural network architecture best predicts disclosure trajectory?
3. **RQ3:** How does TIG compare to sequential models (BERT, LSTM) for trauma disclosure detection?
4. **RQ4:** Can TIG improve chatbot intervention timing and response appropriateness?

---

## 3. Novel Contributions

| # | Contribution | Type | Novelty Level |
|---|--------------|------|---------------|
| **C1** | Temporal Intent Graph (TIG) formulation | Methodology | ⭐⭐⭐⭐⭐ |
| **C2** | Non-linear disclosure pattern taxonomy | Theoretical | ⭐⭐⭐⭐ |
| **C3** | Graph attention mechanism for intent trajectory | Technical | ⭐⭐⭐⭐⭐ |
| **C4** | Disclosure trajectory prediction task | Task Definition | ⭐⭐⭐⭐ |
| **C5** | Trauma disclosure dataset (synthetic + annotated) | Resource | ⭐⭐⭐⭐ |

### Contribution Statements (for paper)

> **C1:** We introduce Temporal Intent Graph (TIG), the first graph-based representation of multi-turn conversations designed specifically for modeling non-linear trauma disclosure patterns.

> **C2:** We propose a taxonomy of disclosure patterns (escalation, retraction, re-disclosure, deflection) grounded in trauma psychology literature.

> **C3:** We develop TIG-Net, a graph neural network with temporal edge attention that predicts disclosure trajectory with X% higher accuracy than sequential baselines.

> **C4:** We formalize the novel task of Disclosure Trajectory Prediction (DTP) and provide benchmarks.

> **C5:** We release [Dataset Name], a dataset of N conversations annotated with disclosure patterns for future research.

---

## 4. Theoretical Framework

### 4.1 Trauma Disclosure Psychology

Based on Pennebaker's Disclosure Theory and Herman's Trauma Recovery Model:

| Pattern | Psychology Basis | In Conversation |
|---------|------------------|-----------------|
| **Gradual Escalation** | Testing safety before revealing more | "something happened" → "he touched me" → "it was my professor" |
| **Retraction** | Fear of judgment, regret of disclosure | "actually it's not that serious" after revealing details |
| **Re-disclosure** | Circling back when feeling safe again | Returns to topic after digression |
| **Deflection** | Self-protection, topic avoidance | Sudden topic change when asked for details |
| **Minimization** | Downplaying severity | "it's just..." "it was only..." |

### 4.2 Why Graphs?

Graphs naturally model:
- **Non-sequential relationships:** Turn 5 can relate to Turn 2, skipping 3-4
- **Multiple edge types:** Temporal, semantic, emotional connections
- **Dynamic structure:** Graph evolves as conversation progresses
- **Attention over history:** Some past turns more relevant than others

---

## 5. System Architecture

### 5.1 Overall Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TIG-Net ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INPUT: Conversation [u₁, u₂, ..., uₜ]                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 1: ENCODER                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Utterance    │  │ Intent       │  │ Emotion      │               │   │
│  │  │ Embedding    │  │ Classifier   │  │ Detector     │               │   │
│  │  │ (BERT/LLM)   │  │ (MLP)        │  │ (MLP)        │               │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │   │
│  │         │                 │                 │                        │   │
│  │         └────────────────┬┴─────────────────┘                        │   │
│  │                          ▼                                           │   │
│  │              Node Feature Vector hᵢ ∈ ℝᵈ                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 2: GRAPH CONSTRUCTION                       │   │
│  │                                                                      │   │
│  │   Nodes: {n₁, n₂, ..., nₜ}  (one per utterance)                     │   │
│  │                                                                      │   │
│  │   Edges: E = E_temporal ∪ E_semantic ∪ E_disclosure                 │   │
│  │                                                                      │   │
│  │   E_temporal:  (nᵢ, nᵢ₊₁) for consecutive turns                     │   │
│  │   E_semantic:  (nᵢ, nⱼ) if sim(hᵢ, hⱼ) > θ                          │   │
│  │   E_disclosure: (nᵢ, nⱼ) if topic_match(uᵢ, uⱼ) and j > i          │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 3: GRAPH ATTENTION NETWORK                  │   │
│  │                                                                      │   │
│  │   h'ᵢ = σ(Σⱼ∈N(i) αᵢⱼ · W · hⱼ)                                     │   │
│  │                                                                      │   │
│  │   αᵢⱼ = softmax(LeakyReLU(aᵀ[Whᵢ ‖ Whⱼ ‖ eᵢⱼ]))                    │   │
│  │                                                                      │   │
│  │   eᵢⱼ = edge features (type, time distance, sentiment diff)        │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 4: TRAJECTORY PREDICTION                    │   │
│  │                                                                      │   │
│  │   Global graph embedding: g = READOUT({h'₁, ..., h'ₜ})              │   │
│  │                                                                      │   │
│  │   Trajectory Prediction:                                             │   │
│  │   P(next_state | Gₜ) = MLP(g ‖ h'ₜ)                                  │   │
│  │                                                                      │   │
│  │   next_state ∈ {escalate, retract, continue, deflect, resolve}      │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  OUTPUT:                                                                    │
│  ├── Current intent classification                                         │
│  ├── Cumulative disclosure score                                           │
│  ├── Trajectory prediction (5-class)                                       │
│  └── Intervention recommendation                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Component Details

#### 5.2.1 Node Encoder
- Base: BERT-base or smaller LLM (IndoBERT for Indonesian)
- Output: 768-dim utterance embedding
- Additional: Intent logits (10 classes), Emotion logits (7 classes)
- Final node feature: Concatenation [embedding; intent; emotion] → 800-dim

#### 5.2.2 Edge Types

| Edge Type | Definition | Weight |
|-----------|------------|--------|
| `TEMPORAL` | Consecutive utterances | 1.0 |
| `SEMANTIC` | Cosine similarity > 0.7 | similarity score |
| `DISCLOSURE` | Same trauma topic, non-consecutive | 1.5 |
| `RETRACTION` | Negation/minimization following disclosure | 2.0 |

#### 5.2.3 Graph Attention
- Multi-head attention (4 heads)
- Edge-conditioned attention weights
- 2-layer GAT with residual connections

---

## 6. Mathematical Formulation

### 6.1 Graph Definition

Let conversation C = {u₁, u₂, ..., uₜ} where uᵢ is utterance at turn i.

**Temporal Intent Graph:**
```
G = (V, E, X, A)

V = {v₁, v₂, ..., vₜ}           # Nodes (one per utterance)
E ⊆ V × V × R                   # Edges with type r ∈ R
X ∈ ℝᵗˣᵈ                         # Node feature matrix
A ∈ ℝᵗˣᵗˣ|R|                     # Adjacency tensors per edge type
```

### 6.2 Node Feature Computation

```
xᵢ = [BERT(uᵢ); Intent(uᵢ); Emotion(uᵢ); Position(i)]

where:
- BERT(uᵢ) ∈ ℝ⁷⁶⁸ : contextual embedding
- Intent(uᵢ) ∈ ℝ¹⁰ : intent probability distribution  
- Emotion(uᵢ) ∈ ℝ⁷ : emotion probability distribution
- Position(i) ∈ ℝ³² : positional encoding
```

### 6.3 Edge Construction

```
E_temporal = {(vᵢ, vᵢ₊₁) | i ∈ [1, t-1]}

E_semantic = {(vᵢ, vⱼ) | cos(xᵢ, xⱼ) > θ_sem, |i-j| > 1}

E_disclosure = {(vᵢ, vⱼ) | topic(uᵢ) = topic(uⱼ), j > i, is_disclosure(uⱼ)}
```

### 6.4 Graph Attention Layer

```
# Message passing with edge-aware attention:

h'ᵢ⁽ˡ⁾ = σ(Σⱼ∈N(i) Σᵣ αᵢⱼʳ · Wʳ · hⱼ⁽ˡ⁻¹⁾)

# Attention coefficients:
αᵢⱼʳ = softmax_j(LeakyReLU(aʳᵀ · [Wʳhᵢ ‖ Wʳhⱼ ‖ eᵢⱼ]))

# Edge features:
eᵢⱼ = [type_embed(r); |i-j|; Δsentiment(i,j); Δintent(i,j)]
```

### 6.5 Trajectory Prediction

```
# Graph-level readout
g = MEAN({h'₁, h'₂, ..., h'ₜ}) + ATTENTION_POOL({h'ᵢ})

# Combined representation
z = [g; h'ₜ; CIS(t)]

where CIS(t) = Σᵢ₌₁ᵗ λⁱ · intent_score(uᵢ)  # Cumulative Intent Score

# Prediction
P(trajectory | Gₜ) = softmax(MLP(z))

trajectory ∈ {ESCALATE, RETRACT, CONTINUE, DEFLECT, RESOLVE}
```

### 6.6 Training Objectives

```
# Multi-task loss:
L = λ₁·L_intent + λ₂·L_trajectory + λ₃·L_disclosure

L_intent = CrossEntropy(intent_pred, intent_true)
L_trajectory = CrossEntropy(traj_pred, traj_true)  
L_disclosure = BCELoss(disclosure_score, disclosure_true)

# Hyperparameters:
λ₁ = 1.0, λ₂ = 1.5, λ₃ = 0.5
```

---

## 7. Dataset Design

### 7.1 Dataset Requirements

| Requirement | Specification |
|-------------|---------------|
| Size | 1,000+ conversations, 10,000+ utterances |
| Languages | Indonesian (primary), English (secondary) |
| Annotation | Intent, emotion, disclosure pattern, trajectory |
| Source | Synthetic generation + expert annotation |

### 7.2 Data Collection Strategy

#### Phase 1: Synthetic Generation (60%)
```
Use LLM (GPT-4/Claude) to generate conversations:
- Prompt with disclosure pattern templates
- Vary: severity, formality, language style
- Include: escalation, retraction, re-disclosure scenarios
```

#### Phase 2: Expert Annotation (40%)
```
- Partner with psychology department
- Annotate real (anonymized) crisis hotline transcripts
- IRB approval required
```

### 7.3 Annotation Schema

```yaml
Conversation:
  id: str
  utterances:
    - turn: int
      speaker: "user" | "bot"
      text: str
      intent: 
        primary: str  # greeting, disclosure, question, etc.
        confidence: float
      emotion: str  # sad, angry, fearful, neutral, etc.
      disclosure_score: float  # 0-1
      trauma_indicators: list[str]  # ["mention_perpetrator", "physical_detail", etc.]
  
  patterns:
    - type: "escalation" | "retraction" | "re-disclosure" | "deflection"
      start_turn: int
      end_turn: int
  
  trajectory_labels:
    - after_turn: int
      next_trajectory: str  # what happened next
```

### 7.4 Intent Taxonomy (10 classes)

| Intent | Description | Example |
|--------|-------------|---------|
| `GREETING` | Opening/closing | "halo", "terima kasih" |
| `DISCLOSURE_INIT` | First mention of trauma | "ada yang mau aku ceritain" |
| `DISCLOSURE_DETAIL` | Adding specifics | "waktu itu di ruangannya" |
| `DISCLOSURE_SEVERE` | Revealing severe aspects | "dia menyentuh..." |
| `QUESTION` | Seeking information | "apa yang harus aku lakukan?" |
| `EMOTIONAL_EXPRESSION` | Expressing feelings | "aku takut", "sedih banget" |
| `RETRACTION` | Pulling back | "tapi ga separah itu sih" |
| `DEFLECTION` | Topic change | "btw soal tugas..." |
| `CONSENT_RESPONSE` | Responding to bot offers | "iya mau", "ga dulu" |
| `OTHER` | Miscellaneous | - |

---

## 8. Experimental Design

### 8.1 Baselines

| Model | Type | Purpose |
|-------|------|---------|
| **BERT-base** | Sequential | Standard intent classification |
| **DialogueBERT** | Sequential | Dialogue-aware BERT |
| **LSTM + Attention** | Sequential | Classic sequence model |
| **HiGRU** | Hierarchical | Hierarchical dialogue model |
| **DialogueGCN** | Graph | Graph for emotion recognition |
| **TIG-Net (Ours)** | Graph | Proposed model |

### 8.2 Experiments

#### Experiment 1: Intent Classification
- Task: Classify intent of current utterance
- Metric: Accuracy, Macro-F1, Weighted-F1
- Comparison: All baselines vs TIG-Net

#### Experiment 2: Trajectory Prediction
- Task: Predict next disclosure trajectory (5-class)
- Metric: Accuracy, Macro-F1
- Comparison: Baselines (last-turn only) vs TIG-Net (graph)

#### Experiment 3: Cumulative Disclosure Detection
- Task: Predict if conversation contains disclosure (binary)
- Metric: AUC-ROC, Precision, Recall
- Focus: Early detection (after 3, 5, 7 turns)

#### Experiment 4: Ablation Study
- Remove each component, measure impact:
  - TIG-Net w/o semantic edges
  - TIG-Net w/o disclosure edges  
  - TIG-Net w/o edge attention
  - TIG-Net w/o emotion features

#### Experiment 5: Real-World Integration
- Deploy TIG-Net in TemanKu chatbot
- A/B test with existing CIS system
- Metric: Intervention appropriateness (human eval)

### 8.3 Expected Results Table

| Model | Intent Acc | Trajectory Acc | Disclosure AUC |
|-------|------------|----------------|----------------|
| BERT-base | 78.5% | 45.2% | 0.72 |
| DialogueBERT | 81.2% | 48.7% | 0.76 |
| LSTM+Attn | 75.3% | 42.1% | 0.69 |
| DialogueGCN | 79.8% | 51.3% | 0.78 |
| **TIG-Net (Ours)** | **85.4%** | **62.8%** | **0.87** |

---

## 9. Paper Structure

### 9.1 Section Outline (8 pages, ACL format)

```
1. INTRODUCTION (1 page)
   - Motivation: Underreporting of harassment
   - Gap: Sequential models miss non-linear patterns
   - Contribution summary: TIG formulation, TIG-Net, dataset
   - Key results preview

2. RELATED WORK (1 page)
   - Intent detection in dialogue systems  
   - Graph neural networks for NLP
   - Crisis chatbots and mental health AI
   - Trauma disclosure psychology

3. PROBLEM FORMULATION (0.5 page)
   - Formal definition of disclosure trajectory
   - Non-linear disclosure patterns taxonomy

4. METHODOLOGY (2 pages)
   - 4.1 Temporal Intent Graph formulation
   - 4.2 Node encoder
   - 4.3 Edge construction
   - 4.4 Graph attention mechanism
   - 4.5 Trajectory prediction head
   - 4.6 Training objective

5. DATASET (0.75 page)
   - Collection methodology
   - Annotation schema
   - Statistics

6. EXPERIMENTS (1.5 pages)
   - 6.1 Experimental setup
   - 6.2 Intent classification results
   - 6.3 Trajectory prediction results
   - 6.4 Ablation study
   - 6.5 Case study: Real conversation analysis

7. DISCUSSION (0.75 page)
   - Why graphs work for trauma disclosure
   - Practical implications for chatbot design
   - Limitations

8. CONCLUSION (0.5 page)
   - Summary of contributions
   - Future work

REFERENCES (not counted in 8 pages)
APPENDIX (supplementary)
   - Dataset examples
   - Full ablation tables  
   - Implementation details
```

---

## 10. Key Highlights to Emphasize

### 10.1 In Abstract
> "We propose Temporal Intent Graph (TIG), the **first graph-based model** for capturing **non-linear disclosure patterns** in trauma-related conversations."

### 10.2 In Introduction
> "Unlike sequential models that assume linear conversation flow, TIG models conversations as **dynamic graphs** where edges connect semantically related utterances across time, enabling detection of **retraction, re-disclosure, and escalation** patterns."

### 10.3 In Experiments
> "TIG-Net achieves **62.8%** trajectory prediction accuracy, a **22%** relative improvement over the best sequential baseline, demonstrating the effectiveness of graph-based modeling for non-linear disclosure."

### 10.4 Key Claims to Support

| Claim | How to Prove |
|-------|--------------|
| "First graph model for trauma disclosure" | Literature review shows no prior work |
| "Captures non-linear patterns" | Visualize graph structure, show edge importance |
| "Outperforms sequential models" | Experimental results table |
| "Practically useful" | Case study + chatbot integration |

---

## 11. Boundaries & Limitations

### 11.1 ⛔ DO NOT DO (Scope Boundaries)

| Boundary | Reason |
|----------|--------|
| ❌ Don't claim to replace human counselors | Ethical issue, not the goal |
| ❌ Don't use real victim data without IRB | Legal and ethical requirement |
| ❌ Don't claim 100% accuracy | Overpromising, unrealistic |
| ❌ Don't ignore false negatives | Critical in crisis context |
| ❌ Don't deploy without human oversight | Safety concern |
| ❌ Don't generalize to all cultures | Dataset is Indonesian-focused |
| ❌ Don't claim causal relationships | Correlation only |
| ❌ Don't ignore computational cost | Graphs are expensive |

### 11.2 Explicit Limitations to State in Paper

```markdown
**Limitations:**

1. **Dataset Size:** Our dataset of N conversations may not capture 
   the full diversity of disclosure patterns.

2. **Synthetic Data:** Majority of training data is synthetically 
   generated, which may not fully reflect real-world complexity.

3. **Language Scope:** Model trained primarily on Indonesian; 
   generalization to other languages requires further study.

4. **Cultural Specificity:** Disclosure patterns may vary across 
   cultures; our taxonomy is based on Indonesian context.

5. **Computational Cost:** Graph construction adds O(n²) complexity 
   compared to sequential models.

6. **Ground Truth Ambiguity:** Trajectory labels are inherently 
   subjective; inter-annotator agreement is reported.
```

### 11.3 Ethical Boundaries

| Aspect | Boundary | Mitigation |
|--------|----------|------------|
| **Data Privacy** | Never use identifiable data | Synthetic + anonymized only |
| **Consent** | Users must know AI is analyzing | Explicit disclosure in chatbot |
| **Autonomy** | Never force action on user | Consent-based escalation |
| **Accuracy Claims** | Don't overstate performance | Report confidence intervals |
| **Deployment** | Always include human backup | 24/7 hotline integration |

### 11.4 What NOT to Claim

```
❌ "TIG can detect all types of trauma"
   → Only tested on sexual harassment disclosure

❌ "TIG replaces human counselors"  
   → TIG assists, does not replace

❌ "TIG works for all languages"
   → Only tested on Indonesian/English

❌ "TIG is ready for production"
   → Research prototype, needs validation
```

---

## 12. Timeline

### 12.1 Research Timeline (6 months)

```
MONTH 1: Foundation
├── Week 1-2: Literature review finalization
├── Week 3-4: Dataset schema design & synthetic generation start

MONTH 2: Data
├── Week 1-2: Complete synthetic dataset (700 conversations)
├── Week 3-4: Annotation guidelines + pilot annotation

MONTH 3: Implementation
├── Week 1-2: TIG-Net implementation (PyTorch Geometric)
├── Week 3-4: Baseline implementations

MONTH 4: Experiments
├── Week 1: Training TIG-Net
├── Week 2: Baseline experiments
├── Week 3: Ablation studies
├── Week 4: Analysis & visualization

MONTH 5: Integration & Writing
├── Week 1-2: TemanKu integration + case study
├── Week 3-4: Paper writing (first draft)

MONTH 6: Submission
├── Week 1-2: Paper revision
├── Week 3: Internal review
├── Week 4: Submission to venue
```

### 12.2 Target Submission Dates

| Venue | Deadline | Notification |
|-------|----------|--------------|
| EMNLP 2025 | June 2025 | Sep 2025 |
| ACL 2025 | Feb 2025 | May 2025 |
| AAAI 2026 | Aug 2025 | Dec 2025 |
| NAACL 2025 | Oct 2024 | Jan 2025 |

---

## 13. Evaluation Metrics

### 13.1 Quantitative Metrics

| Task | Metric | Formula |
|------|--------|---------|
| Intent Classification | Accuracy | Correct / Total |
| Intent Classification | Macro-F1 | Average F1 across classes |
| Trajectory Prediction | Accuracy | Correct trajectory / Total |
| Trajectory Prediction | Weighted-F1 | F1 weighted by class frequency |
| Disclosure Detection | AUC-ROC | Area under ROC curve |
| Disclosure Detection | Recall@K | Recall when returning top K |
| Early Detection | Turn@Threshold | First turn achieving threshold |

### 13.2 Human Evaluation

| Aspect | Method | Scale |
|--------|--------|-------|
| Intervention Timing | Expert rating | 1-5 Likert |
| Response Appropriateness | Expert rating | 1-5 Likert |
| Empathy Perception | User survey | 1-5 Likert |

---

## 14. Ethical Considerations

### 14.1 IRB Requirements

```
If using real data:
1. Submit IRB application to university ethics committee
2. Obtain informed consent from participants
3. Anonymize all personally identifiable information
4. Secure data storage (encrypted, access-controlled)
5. Right to withdraw at any time
```

### 14.2 Responsible AI Statement (for paper)

```markdown
**Ethics Statement:**

This research aims to improve support for trauma survivors through 
better AI understanding. We acknowledge the sensitive nature of 
this domain and take the following precautions:

1. All data is either synthetically generated or collected with 
   explicit informed consent and IRB approval.

2. Our system is designed to assist, not replace, human counselors.

3. We recommend deployment only with appropriate human oversight 
   and crisis hotline integration.

4. We recognize the limitations of AI in understanding human trauma 
   and caution against over-reliance on automated systems.

5. We commit to releasing our dataset and code responsibly, with 
   appropriate usage guidelines.
```

---

## 15. Code Structure (Implementation Plan)

```
tig-net/
├── data/
│   ├── raw/
│   ├── processed/
│   └── splits/
├── src/
│   ├── models/
│   │   ├── tig_net.py          # Main TIG-Net model
│   │   ├── node_encoder.py     # BERT-based encoder
│   │   ├── graph_builder.py    # Edge construction
│   │   └── baselines/          # Baseline implementations
│   ├── data/
│   │   ├── dataset.py          # PyTorch dataset
│   │   └── preprocessing.py
│   ├── training/
│   │   ├── trainer.py
│   │   └── config.py
│   └── evaluation/
│       ├── metrics.py
│       └── visualization.py
├── experiments/
│   ├── exp1_intent.py
│   ├── exp2_trajectory.py
│   └── exp3_ablation.py
├── notebooks/
│   └── analysis.ipynb
└── scripts/
    ├── generate_synthetic.py
    └── annotate.py
```

---

## 16. Summary Checklist

### Before Submission:

- [ ] Dataset complete (1000+ conversations)
- [ ] TIG-Net implementation tested
- [ ] All baselines implemented and run
- [ ] Ablation study complete
- [ ] Statistical significance tests done
- [ ] Visualizations created
- [ ] Paper drafted
- [ ] Ethics statement written
- [ ] Code cleaned for release
- [ ] Supplementary materials prepared

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-24  
**Author:** Sulthonika Mahfudz Al Mujahidin
