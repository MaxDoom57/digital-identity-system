package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type OrgPermissionContract struct {
	contractapi.Contract
}

type Organization struct {
	OrgID         string   `json:"orgId"`
	OrgName       string   `json:"orgName"`
	Sector        string   `json:"sector"`
	AllowedFields []string `json:"allowedFields"`
	IsActive      bool     `json:"isActive"`
	RegisteredAt  string   `json:"registeredAt"`
	ApprovedBy    string   `json:"approvedBy"`
}

func (c *OrgPermissionContract) RegisterOrganization(ctx contractapi.TransactionContextInterface,
	orgId string, orgName string, sector string, allowedFieldsJSON string, approvedBy string) error {

	key := "ORG_" + orgId
	existing, _ := ctx.GetStub().GetState(key)
	if existing != nil {
		return fmt.Errorf("organization %s already exists", orgId)
	}

	var allowedFields []string
	err := json.Unmarshal([]byte(allowedFieldsJSON), &allowedFields)
	if err != nil {
		return fmt.Errorf("invalid allowedFields JSON: %s", err.Error())
	}

	org := Organization{
		OrgID:         orgId,
		OrgName:       orgName,
		Sector:        sector,
		AllowedFields: allowedFields,
		IsActive:      true,
		RegisteredAt:  func() string { ts, _ := ctx.GetStub().GetTxTimestamp(); return fmt.Sprintf("%d", ts.Seconds) }(),
		ApprovedBy:    approvedBy,
	}

	orgJSON, err := json.Marshal(org)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(key, orgJSON)
}

func (c *OrgPermissionContract) GetOrganization(ctx contractapi.TransactionContextInterface,
	orgId string) (*Organization, error) {

	key := "ORG_" + orgId
	orgJSON, err := ctx.GetStub().GetState(key)
	if err != nil {
		return nil, err
	}
	if orgJSON == nil {
		return nil, fmt.Errorf("organization %s does not exist", orgId)
	}

	var org Organization
	err = json.Unmarshal(orgJSON, &org)
	if err != nil {
		return nil, err
	}
	return &org, nil
}

func (c *OrgPermissionContract) GetOrgPermittedFields(ctx contractapi.TransactionContextInterface,
	orgId string) ([]string, error) {

	org, err := c.GetOrganization(ctx, orgId)
	if err != nil {
		return nil, err
	}
	if !org.IsActive {
		return nil, fmt.Errorf("organization %s is suspended", orgId)
	}
	return org.AllowedFields, nil
}

func (c *OrgPermissionContract) UpdateOrgFields(ctx contractapi.TransactionContextInterface,
	orgId string, allowedFieldsJSON string) error {

	org, err := c.GetOrganization(ctx, orgId)
	if err != nil {
		return err
	}

	var allowedFields []string
	err = json.Unmarshal([]byte(allowedFieldsJSON), &allowedFields)
	if err != nil {
		return fmt.Errorf("invalid allowedFields JSON: %s", err.Error())
	}

	org.AllowedFields = allowedFields
	orgJSON, err := json.Marshal(org)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState("ORG_"+orgId, orgJSON)
}

func (c *OrgPermissionContract) SuspendOrganization(ctx contractapi.TransactionContextInterface,
	orgId string) error {

	org, err := c.GetOrganization(ctx, orgId)
	if err != nil {
		return err
	}

	org.IsActive = false
	orgJSON, err := json.Marshal(org)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState("ORG_"+orgId, orgJSON)
}

func (c *OrgPermissionContract) GetAllOrganizations(ctx contractapi.TransactionContextInterface) ([]*Organization, error) {
	iterator, err := ctx.GetStub().GetStateByRange("ORG_", "ORG_z")
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	var orgs []*Organization
	for iterator.HasNext() {
		result, err := iterator.Next()
		if err != nil {
			return nil, err
		}
		var org Organization
		err = json.Unmarshal(result.Value, &org)
		if err != nil {
			return nil, err
		}
		orgs = append(orgs, &org)
	}
	if orgs == nil {
		return []*Organization{}, nil
	}
	return orgs, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&OrgPermissionContract{})
	if err != nil {
		fmt.Printf("Error creating orgpermission chaincode: %s", err.Error())
		return
	}
	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting orgpermission chaincode: %s", err.Error())
	}
}
