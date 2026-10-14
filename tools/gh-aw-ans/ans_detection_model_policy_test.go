//go:build !integration

package workflow

import (
	"strings"
	"testing"
)

func TestANSDetectionModelPolicy(t *testing.T) {
	disabled := false
	fallback := TemplatableBool("false")
	parent := &WorkflowData{
		AI: "copilot", Model: "gpt-6.1-sol",
		EngineConfig: &EngineConfig{ID: "copilot", Version: "1.0.96", MaxAICredits: 1000},
		SandboxConfig: &SandboxConfig{Agent: &AgentSandboxConfig{
			TokenSteering: &disabled, ModelFallback: &fallback,
			Mounts: []string{"/private:/private:rw"}, Disabled: true,
		}},
		NetworkPermissions: &NetworkPermissions{Firewall: &FirewallConfig{Enabled: true, Version: "0.28.23"}},
		SafeOutputs:        &SafeOutputsConfig{ThreatDetection: &ThreatDetectionConfig{MaxAICredits: 400}},
	}
	detection := buildThreatDetectionWorkflowData(parent, "copilot")
	agent := detection.SandboxConfig.Agent
	if agent.TokenSteering == nil || *agent.TokenSteering || agent.ModelFallback == nil || *agent.ModelFallback != fallback {
		t.Fatal("detection dropped explicit model routing policies")
	}
	if agent.TokenSteering == parent.SandboxConfig.Agent.TokenSteering || agent.ModelFallback == parent.SandboxConfig.Agent.ModelFallback {
		t.Fatal("detection policy pointers alias the parent")
	}
	if agent.Disabled || len(agent.Mounts) != 0 || agent.Type != SandboxTypeAWF {
		t.Fatal("inherited parent mounts or disabled sandbox")
	}
	detection.EngineConfig = &EngineConfig{ID: "copilot", MaxAICredits: 400}
	config, err := BuildAWFConfigJSON(AWFCommandConfig{EngineName: "copilot", WorkflowData: detection})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(config, `"enableTokenSteering":false`) || !strings.Contains(config, `"modelFallback":{"enabled":false}`) {
		t.Fatal("detection AWF proxy does not preserve the configured model")
	}
	compiler := NewCompiler()
	steps := strings.Join(compiler.buildExternalDetectorExecutionStep(parent), "")
	if !strings.Contains(steps, `"enableTokenSteering":false`) || !strings.Contains(steps, `"modelFallback":{"enabled":false}`) {
		t.Fatalf("external detector step omitted exact-model proxy policies: %s", steps)
	}
	steps = strings.Join(compiler.buildDetectionEngineExecutionStep(parent), "")
	if !strings.Contains(steps, `"enableTokenSteering":false`) || !strings.Contains(steps, `"modelFallback":{"enabled":false}`) {
		t.Fatal("inline detector step omitted exact-model proxy policies")
	}
}

func TestANSDetectionModelPolicyDefaults(t *testing.T) {
	for _, sandbox := range []*SandboxConfig{nil, {}, {Agent: &AgentSandboxConfig{}}} {
		detection := buildThreatDetectionWorkflowData(&WorkflowData{SandboxConfig: sandbox}, "copilot")
		if detection.SandboxConfig.Agent.TokenSteering != nil || detection.SandboxConfig.Agent.ModelFallback != nil {
			t.Fatal("unspecified model policy acquired an override")
		}
	}
	steering := true
	fallback := TemplatableBool("${{ vars.MODEL_FALLBACK == 'true' }}")
	detection := buildThreatDetectionWorkflowData(&WorkflowData{SandboxConfig: &SandboxConfig{Agent: &AgentSandboxConfig{TokenSteering: &steering, ModelFallback: &fallback}}}, "copilot")
	if detection.SandboxConfig.Agent.TokenSteering == nil || !*detection.SandboxConfig.Agent.TokenSteering || detection.SandboxConfig.Agent.ModelFallback == nil || *detection.SandboxConfig.Agent.ModelFallback != fallback {
		t.Fatal("configured true or templatable model policy was changed")
	}
}
