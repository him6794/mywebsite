package main

import (
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/subtle"
	"encoding/hex"
	"hash"
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"
	"golang.org/x/crypto/pbkdf2"
	"golang.org/x/crypto/scrypt"
)

const (
	maxPasswordHashBytes        = 64
	maxPasswordSaltBytes        = 128
	maxPBKDF2Iterations         = 2_000_000
	maxScryptMemoryBytes        = 128 * 1024 * 1024
	maxScryptWorkFactor  uint64 = 1 << 23
)

func verifyPasswordHash(encoded, password string) bool {
	if bcrypt.CompareHashAndPassword([]byte(encoded), []byte(password)) == nil {
		return true
	}

	parts := strings.Split(encoded, "$")
	if len(parts) != 3 || len(parts[1]) == 0 || len(parts[1]) > maxPasswordSaltBytes {
		return false
	}

	expected, err := hex.DecodeString(parts[2])
	if err != nil || len(expected) == 0 || len(expected) > maxPasswordHashBytes {
		return false
	}

	method := strings.Split(parts[0], ":")
	switch method[0] {
	case "scrypt":
		return verifyWerkzeugScrypt(method, parts[1], expected, password)
	case "pbkdf2":
		return verifyWerkzeugPBKDF2(method, parts[1], expected, password)
	default:
		return false
	}
}

func verifyWerkzeugScrypt(method []string, salt string, expected []byte, password string) bool {
	if len(method) != 4 || len(expected) != 64 {
		return false
	}
	n, errN := strconv.Atoi(method[1])
	r, errR := strconv.Atoi(method[2])
	p, errP := strconv.Atoi(method[3])
	if errN != nil || errR != nil || errP != nil || n < 2 || n > 1<<20 || n&(n-1) != 0 || r < 1 || r > 32 || p < 1 || p > 16 {
		return false
	}
	memory := uint64(128) * uint64(n) * uint64(r)
	work := uint64(n) * uint64(r) * uint64(p)
	if memory > maxScryptMemoryBytes || work > maxScryptWorkFactor {
		return false
	}

	actual, err := scrypt.Key([]byte(password), []byte(salt), n, r, p, len(expected))
	return err == nil && subtle.ConstantTimeCompare(actual, expected) == 1
}

func verifyWerkzeugPBKDF2(method []string, salt string, expected []byte, password string) bool {
	if len(method) != 3 {
		return false
	}
	var newHash func() hash.Hash
	switch method[1] {
	case "sha1":
		newHash = sha1.New
	case "sha256":
		newHash = sha256.New
	case "sha384":
		newHash = sha512.New384
	case "sha512":
		newHash = sha512.New
	default:
		return false
	}
	iterations, err := strconv.Atoi(method[2])
	if err != nil || iterations < 1 || iterations > maxPBKDF2Iterations || len(expected) != newHash().Size() {
		return false
	}

	actual := pbkdf2.Key([]byte(password), []byte(salt), iterations, len(expected), newHash)
	return subtle.ConstantTimeCompare(actual, expected) == 1
}
